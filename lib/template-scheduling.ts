import { z } from "zod";
import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { SITE } from "@/lib/constants";
import { effectiveTemplateDefaults } from "@/lib/session-template-defaults";
import { isRosterCreditSession } from "@/lib/roster-credit-sessions";
import { buildOccurrenceDates } from "@/lib/sessions";
import { endTimeFromStart, normalizeTime } from "@/lib/session-time";
import {
  getSessionTemplate,
  resolveGroupSessionTypeId,
} from "@/lib/session-templates";
import { requireTrainingTenantId } from "@/lib/tenant/deployment";
import type { PaymentRequirement, SessionStatus } from "@/lib/types/database";

export const templateScheduleSchema = z.object({
  mode: z.enum(["once", "repeating"]),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recurrence: z
    .enum(["none", "weekly", "weekdays", "custom"])
    .optional()
    .default("none"),
  recurrence_weeks: z.coerce.number().int().min(1).max(26).optional().default(1),
  recurrence_days: z
    .array(z.coerce.number().int().min(0).max(6))
    .optional()
    .default([]),
  start_time_override: z.string().min(4).optional().nullable(),
  trainer_id_override: z.string().uuid().optional().nullable(),
  capacity_override: z.coerce.number().int().positive().optional().nullable(),
  price_cents_override: z.coerce.number().int().nonnegative().optional().nullable(),
  notes_override: z.string().max(2000).optional().nullable(),
  status: z
    .enum(["draft", "published", "full", "cancelled", "completed"])
    .optional()
    .default("published"),
  skip_duplicates: z.boolean().optional().default(false),
});

export type TemplateScheduleInput = z.infer<typeof templateScheduleSchema>;

export type TemplateOccurrencePreview = {
  session_date: string;
  start_time: string;
  end_time: string;
  title: string;
};

export type TemplateScheduleConflict = {
  session_date: string;
  start_time: string;
  existing_session_id: string;
  existing_title: string;
};

export type TemplateSchedulePreview = {
  occurrences: TemplateOccurrencePreview[];
  count: number;
  conflicts: TemplateScheduleConflict[];
  errors: string[];
};

function recurrenceForInput(input: TemplateScheduleInput) {
  if (input.mode === "once") {
    return {
      recurrence: "none" as const,
      weeks: 1,
      days: [] as number[],
    };
  }
  if (input.recurrence === "custom" && (input.recurrence_days?.length ?? 0) === 0) {
    return null;
  }
  return {
    recurrence: input.recurrence ?? "weekly",
    weeks: input.recurrence_weeks ?? 1,
    days: input.recurrence_days ?? [],
  };
}

export async function buildTemplateOccurrencePlan(
  templateId: string,
  input: TemplateScheduleInput,
): Promise<
  | {
      ok: true;
      preview: TemplateSchedulePreview;
      rows: Record<string, unknown>[];
    }
  | { ok: false; errors: string[] }
> {
  const parsed = templateScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => i.message),
    };
  }

  const template = await getSessionTemplate(templateId);
  if (!template) {
    return { ok: false, errors: ["Template not found"] };
  }
  if (!template.is_active) {
    return { ok: false, errors: ["Template is archived"] };
  }

  const recurrenceInput = recurrenceForInput(parsed.data);
  if (!recurrenceInput) {
    return { ok: false, errors: ["Select at least one weekday"] };
  }

  const { recurrence, weeks, days } = recurrenceInput;
  const dates = buildOccurrenceDates(
    parsed.data.session_date,
    recurrence,
    weeks,
    days,
  );

  if (dates.length === 0) {
    return { ok: false, errors: ["No dates in schedule range"] };
  }

  const startTime = normalizeTime(
    parsed.data.start_time_override?.trim() ||
      template.default_start_time.slice(0, 8),
  );
  const effective = effectiveTemplateDefaults(template.program, template);
  const duration = effective.duration_minutes;
  const endTime = normalizeTime(
    endTimeFromStart(startTime.slice(0, 5), duration),
  );
  const capacity =
    parsed.data.capacity_override ?? effective.capacity;
  const priceCents =
    parsed.data.price_cents_override ?? effective.price_cents;
  const visibility = effective.visibility;
  const trainerId =
    parsed.data.trainer_id_override ?? template.default_trainer_id;
  const sessionTypeId =
    template.default_session_type_id ?? (await resolveGroupSessionTypeId());

  const description =
    [template.description, parsed.data.notes_override?.trim()]
      .filter(Boolean)
      .join("\n\n") || null;

  const rosterCredit = isRosterCreditSession({ program: template.program });
  const paymentRequirement: PaymentRequirement = rosterCredit
    ? "pay_at_facility"
    : priceCents > 0
      ? "online_or_facility"
      : "pay_at_facility";

  const status =
    visibility === "hidden"
      ? ("draft" as SessionStatus)
      : (parsed.data.status as SessionStatus);

  const conflicts = await findScheduleConflicts({
    programId: template.program_id,
    templateId: template.id,
    dates,
    startTime,
  });

  const errors: string[] = [];
  if (conflicts.length > 0 && !parsed.data.skip_duplicates) {
    errors.push(
      `${conflicts.length} conflicting session(s) already exist for this program, date, and start time.`,
    );
  }

  const conflictKeys = new Set(
    conflicts.map((c) => `${c.session_date}|${c.start_time}`),
  );
  const datesToCreate = parsed.data.skip_duplicates
    ? dates.filter((d) => !conflictKeys.has(`${d}|${startTime}`))
    : dates;

  const occurrences: TemplateOccurrencePreview[] = datesToCreate.map(
    (session_date) => ({
      session_date,
      start_time: startTime,
      end_time: endTime,
      title: template.name,
    }),
  );

  const recurrenceGroupId =
    datesToCreate.length > 1 ? crypto.randomUUID() : null;

  const rows = datesToCreate.map((session_date) => ({
    template_id: template.id,
    title: template.name,
    program_id: template.program_id,
    session_type_id: sessionTypeId,
    trainer_id: trainerId,
    description,
    session_date,
    start_time: startTime,
    end_time: endTime,
    timezone: SITE.timezone,
    minimum_age: template.program?.minimum_age ?? null,
    maximum_age: template.program?.maximum_age ?? null,
    skill_level: null,
    capacity,
    price_cents: rosterCredit ? 0 : priceCents,
    deposit_amount_cents: null,
    currency: "usd",
    payment_requirement: paymentRequirement,
    location_name: SITE.name,
    location_address: SITE.address.full,
    what_to_bring:
      "Athletic shoes, water bottle, comfortable training clothes",
    cancellation_policy:
      "Please cancel at least 24 hours in advance when possible.",
    status,
    featured: false,
    published_at:
      status === "published" ? new Date().toISOString() : null,
    visibility,
    recurrence_group_id: recurrenceGroupId,
    created_by: null,
  }));

  return {
    ok: true,
    preview: {
      occurrences,
      count: rows.length,
      conflicts,
      errors,
    },
    rows,
  };
}

async function findScheduleConflicts(input: {
  programId: string | null;
  templateId: string;
  dates: string[];
  startTime: string;
}): Promise<TemplateScheduleConflict[]> {
  if (
    !isSupabaseConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    input.dates.length === 0
  ) {
    return [];
  }

  requireTrainingTenantId();
  const supabase = createTrainingServiceClient();
  let query = supabase
    .from(DAWG_TABLES.sessions)
    .select("id, session_date, start_time, title, program_id, template_id")
    .in("session_date", input.dates)
    .eq("start_time", input.startTime)
    .neq("status", "cancelled");

  if (input.programId) {
    query = query.eq("program_id", input.programId);
  }

  const { data, error } = await query;
  if (error || !data?.length) return [];

  return data.map((row) => ({
    session_date: row.session_date as string,
    start_time: row.start_time as string,
    existing_session_id: row.id as string,
    existing_title: row.title as string,
  }));
}

export async function previewTemplateOccurrences(
  templateId: string,
  input: TemplateScheduleInput,
): Promise<TemplateSchedulePreview | { errors: string[] }> {
  const plan = await buildTemplateOccurrencePlan(templateId, input);
  if (!plan.ok) return { errors: plan.errors };
  return plan.preview;
}

export async function scheduleTemplateOccurrences(
  templateId: string,
  input: TemplateScheduleInput,
  createdBy?: string | null,
): Promise<
  | { ok: true; ids: string[]; preview: TemplateSchedulePreview }
  | { ok: false; error: string; code?: string; preview?: TemplateSchedulePreview }
> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Supabase is not configured", code: "NO_DB" };
  }

  const plan = await buildTemplateOccurrencePlan(templateId, input);
  if (!plan.ok) {
    return { ok: false, error: plan.errors.join(" "), code: "VALIDATION" };
  }

  if (plan.preview.errors.length > 0 && !input.skip_duplicates) {
    return {
      ok: false,
      error: plan.preview.errors[0] ?? "Scheduling blocked",
      code: "CONFLICT",
      preview: plan.preview,
    };
  }

  if (plan.rows.length === 0) {
    return {
      ok: false,
      error: "No new sessions to create (all dates conflict).",
      code: "NO_ROWS",
      preview: plan.preview,
    };
  }

  const supabase = createTrainingServiceClient();
  const rows = plan.rows.map((row) => ({
    ...row,
    created_by: createdBy ?? null,
  }));

  const { data, error } = await supabase
    .from(DAWG_TABLES.sessions)
    .insert(rows)
    .select("id");

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Could not create sessions",
      code: "INSERT_FAILED",
      preview: plan.preview,
    };
  }

  return {
    ok: true,
    ids: data.map((r) => r.id as string),
    preview: plan.preview,
  };
}
