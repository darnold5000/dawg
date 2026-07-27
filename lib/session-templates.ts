import { z } from "zod";
import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES, TRAINING_TABLES } from "@/lib/supabase/tables";
import { requireTrainingTenantId } from "@/lib/tenant/deployment";
import type {
  Program,
  SessionTemplate,
  SessionTemplateWithRelations,
  SessionType,
  Trainer,
} from "@/lib/types/database";
import { getPrograms, getSessionTypes, getTrainers } from "@/lib/data";
import { normalizeTime } from "@/lib/session-time";
import { toUuidOrNull } from "@/lib/uuid";

const uuidOrNull = z.preprocess(
  toUuidOrNull,
  z.string().uuid().nullable().optional(),
);

export const sessionTemplateFormSchema = z.object({
  name: z.string().min(1).max(160),
  program_id: uuidOrNull,
  description: z.string().max(2000).optional().nullable(),
  default_start_time: z.string().min(4),
  default_duration_minutes: z.coerce.number().int().min(15).max(480).default(60),
  default_capacity: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
  default_price_cents: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional(),
  default_trainer_id: uuidOrNull,
  default_assistant_trainer_id: uuidOrNull,
  default_session_type_id: uuidOrNull,
  default_visibility: z
    .enum([
      "public",
      "private",
      "members_only",
      "hidden",
      "waitlist_only",
    ])
    .optional()
    .nullable(),
  is_active: z.boolean().optional().default(true),
});

export type SessionTemplateFormInput = z.infer<typeof sessionTemplateFormSchema>;

function assertTrainingConfigured(): void {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase is not configured");
  }
  requireTrainingTenantId();
}

function enrichTemplate(
  row: SessionTemplate,
  ctx: {
    programs: Program[];
    trainers: Trainer[];
    types: SessionType[];
  },
): SessionTemplateWithRelations {
  return {
    ...row,
    program: ctx.programs.find((p) => p.id === row.program_id) ?? null,
    trainer: ctx.trainers.find((t) => t.id === row.default_trainer_id) ?? null,
    session_type:
      ctx.types.find((t) => t.id === row.default_session_type_id) ?? null,
  };
}

async function loadRelationContext() {
  const [programs, trainers, types] = await Promise.all([
    getPrograms(),
    getTrainers(),
    getSessionTypes(),
  ]);
  return { programs, trainers, types };
}

export async function listSessionTemplates(options?: {
  includeInactive?: boolean;
}): Promise<SessionTemplateWithRelations[]> {
  assertTrainingConfigured();
  const supabase = createTrainingServiceClient();
  let query = supabase
    .from(TRAINING_TABLES.sessionTemplates)
    .select("*")
    .order("name");

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const ctx = await loadRelationContext();
  return (data as SessionTemplate[]).map((row) => enrichTemplate(row, ctx));
}

export async function getSessionTemplate(
  id: string,
): Promise<SessionTemplateWithRelations | null> {
  assertTrainingConfigured();
  const supabase = createTrainingServiceClient();
  const { data, error } = await supabase
    .from(TRAINING_TABLES.sessionTemplates)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const ctx = await loadRelationContext();
  return enrichTemplate(data as SessionTemplate, ctx);
}

function templateRowFromInput(input: SessionTemplateFormInput) {
  const parsed = sessionTemplateFormSchema.parse(input);
  return {
    name: parsed.name.trim(),
    program_id: parsed.program_id || null,
    description: parsed.description?.trim() || null,
    default_start_time: normalizeTime(parsed.default_start_time),
    default_duration_minutes: parsed.default_duration_minutes,
    default_capacity: parsed.default_capacity ?? null,
    default_price_cents: parsed.default_price_cents ?? null,
    default_trainer_id: parsed.default_trainer_id || null,
    default_assistant_trainer_id: parsed.default_assistant_trainer_id || null,
    default_session_type_id: parsed.default_session_type_id || null,
    default_visibility: parsed.default_visibility ?? null,
    is_active: parsed.is_active ?? true,
  };
}

export async function createSessionTemplate(
  input: SessionTemplateFormInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    assertTrainingConfigured();
    const supabase = createTrainingServiceClient();
    const { data, error } = await supabase
      .from(TRAINING_TABLES.sessionTemplates)
      .insert(templateRowFromInput(input))
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Could not create template" };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not create template",
    };
  }
}

export async function updateSessionTemplate(
  id: string,
  input: SessionTemplateFormInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    assertTrainingConfigured();
    const supabase = createTrainingServiceClient();
    const { error } = await supabase
      .from(TRAINING_TABLES.sessionTemplates)
      .update(templateRowFromInput(input))
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not update template",
    };
  }
}

export async function archiveSessionTemplate(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    assertTrainingConfigured();
    const supabase = createTrainingServiceClient();
    const { error } = await supabase
      .from(TRAINING_TABLES.sessionTemplates)
      .update({ is_active: false })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not archive template",
    };
  }
}

export async function duplicateSessionTemplate(
  id: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const existing = await getSessionTemplate(id);
  if (!existing) {
    return { ok: false, error: "Template not found" };
  }

  const baseName = existing.name.replace(/\s+\(copy(?: \d+)?\)$/i, "");
  let candidate = `${baseName} (copy)`;
  const all = await listSessionTemplates({ includeInactive: true });
  let n = 2;
  while (all.some((t) => t.name.toLowerCase() === candidate.toLowerCase())) {
    candidate = `${baseName} (copy ${n})`;
    n += 1;
  }

  return createSessionTemplate({
    name: candidate,
    program_id: existing.program_id,
    description: existing.description,
    default_start_time: existing.default_start_time.slice(0, 5),
    default_duration_minutes: existing.default_duration_minutes,
    default_capacity: existing.default_capacity,
    default_price_cents: existing.default_price_cents,
    default_trainer_id: existing.default_trainer_id,
    default_assistant_trainer_id: existing.default_assistant_trainer_id,
    default_session_type_id: existing.default_session_type_id,
    default_visibility: existing.default_visibility,
    is_active: true,
  });
}

export async function resolveGroupSessionTypeId(): Promise<string | null> {
  const types = await getSessionTypes();
  return types.find((t) => t.slug === "group-class")?.id ?? types[0]?.id ?? null;
}

export async function countSessionsForTemplate(id: string): Promise<number> {
  assertTrainingConfigured();
  const supabase = createTrainingServiceClient();
  const { count, error } = await supabase
    .from(DAWG_TABLES.sessions)
    .select("id", { count: "exact", head: true })
    .eq("template_id", id);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
