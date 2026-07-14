import { addDays, format, parse } from "date-fns";
import { z } from "zod";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import type { PaymentRequirement, SessionStatus } from "@/lib/types/database";

export const sessionFormSchema = z.object({
  title: z.string().min(1).max(160),
  program_id: z.string().optional().nullable(),
  session_type_id: z.string().optional().nullable(),
  trainer_id: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().min(4),
  end_time: z.string().min(4),
  minimum_age: z.coerce.number().int().optional().nullable(),
  maximum_age: z.coerce.number().int().optional().nullable(),
  skill_level: z.string().max(80).optional().nullable(),
  capacity: z.coerce.number().int().positive(),
  price: z.coerce.number().nonnegative(),
  deposit_amount: z.coerce.number().nonnegative().optional().nullable(),
  payment_requirement: z.enum([
    "full_at_booking",
    "deposit_at_booking",
    "pay_at_facility",
  ]),
  location_name: z.string().optional().nullable(),
  location_address: z.string().optional().nullable(),
  what_to_bring: z.string().optional().nullable(),
  cancellation_policy: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "full", "cancelled", "completed"]),
  featured: z.boolean().optional(),
  recurrence: z
    .enum(["none", "weekly", "weekdays"])
    .optional()
    .default("none"),
  recurrence_weeks: z.coerce.number().int().min(1).max(26).optional().default(1),
});

export type SessionFormInput = z.infer<typeof sessionFormSchema>;

function normalizeTime(value: string): string {
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value.slice(0, 8);
}

function buildOccurrenceDates(
  startDate: string,
  recurrence: "none" | "weekly" | "weekdays",
  weeks: number,
): string[] {
  if (recurrence === "none" || weeks <= 1) return [startDate];

  const dates: string[] = [];
  const start = parse(startDate, "yyyy-MM-dd", new Date());

  if (recurrence === "weekly") {
    for (let i = 0; i < weeks; i++) {
      dates.push(format(addDays(start, i * 7), "yyyy-MM-dd"));
    }
    return dates;
  }

  // weekdays for N weeks
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(format(d, "yyyy-MM-dd"));
    }
  }
  return dates;
}

export async function createSessionsFromForm(
  input: SessionFormInput,
  createdBy?: string | null,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const parsed = sessionFormSchema.parse(input);

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, ids: [`demo-${crypto.randomUUID()}`] };
  }

  const supabase = createServiceClient();
  const dates = buildOccurrenceDates(
    parsed.session_date,
    parsed.recurrence ?? "none",
    parsed.recurrence_weeks ?? 1,
  );
  const recurrenceGroupId =
    dates.length > 1 ? crypto.randomUUID() : null;

  const rows = dates.map((session_date) => ({
    title: parsed.title,
    program_id: parsed.program_id || null,
    session_type_id: parsed.session_type_id || null,
    trainer_id: parsed.trainer_id || null,
    description: parsed.description || null,
    session_date,
    start_time: normalizeTime(parsed.start_time),
    end_time: normalizeTime(parsed.end_time),
    minimum_age: parsed.minimum_age ?? null,
    maximum_age: parsed.maximum_age ?? null,
    skill_level: parsed.skill_level || null,
    capacity: parsed.capacity,
    price: parsed.price,
    deposit_amount: parsed.deposit_amount ?? null,
    payment_requirement: parsed.payment_requirement as PaymentRequirement,
    location_name: parsed.location_name || null,
    location_address: parsed.location_address || null,
    what_to_bring: parsed.what_to_bring || null,
    cancellation_policy: parsed.cancellation_policy || null,
    status: parsed.status as SessionStatus,
    featured: parsed.featured ?? false,
    published_at: parsed.status === "published" ? new Date().toISOString() : null,
    recurrence_group_id: recurrenceGroupId,
    created_by: createdBy ?? null,
  }));

  const { data, error } = await supabase
    .from(DAWG_TABLES.sessions)
    .insert(rows)
    .select("id");

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create sessions" };
  }

  return { ok: true, ids: data.map((r) => r.id) };
}

export async function updateSessionStatus(
  id: string,
  status: SessionStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from(DAWG_TABLES.sessions)
    .update({
      status,
      published_at:
        status === "published" ? new Date().toISOString() : undefined,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function generatePrivateSlots(input: {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  bufferMinutes: number;
}): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const day = parse(input.date, "yyyy-MM-dd", new Date());
  let cursor = parse(normalizeTime(input.startTime), "HH:mm:ss", day);
  const end = parse(normalizeTime(input.endTime), "HH:mm:ss", day);

  while (cursor.getTime() + input.durationMinutes * 60_000 <= end.getTime()) {
    const slotEnd = new Date(
      cursor.getTime() + input.durationMinutes * 60_000,
    );
    slots.push({
      start: format(cursor, "HH:mm:ss"),
      end: format(slotEnd, "HH:mm:ss"),
    });
    cursor = new Date(
      slotEnd.getTime() + input.bufferMinutes * 60_000,
    );
  }

  return slots;
}
