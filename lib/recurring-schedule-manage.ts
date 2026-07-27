import { addDays, format, parseISO } from "date-fns";
import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { classCardHeading, classTimeLabel } from "@/lib/class-display";
import { formatSessionTime } from "@/lib/format";
import { listSessionTemplates } from "@/lib/session-templates";
import { endTimeFromStart, normalizeTime, timeToHHMM } from "@/lib/session-time";
import { scheduleTemplateOccurrences } from "@/lib/template-scheduling";

export type RecurringScheduleSummary = {
  template_id: string;
  class_name: string;
  calendar_color: string | null;
  time_label: string;
  start_time: string;
  session_count: number;
  start_date: string | null;
  end_date: string | null;
  recurrence_label: string;
  has_schedule: boolean;
};

function inferRecurrenceLabel(dates: string[]): string {
  if (dates.length === 0) return "—";
  if (dates.length === 1) return "One time";
  const weekdays = new Set<number>();
  let hasWeekend = false;
  for (const d of dates) {
    const day = parseISO(d).getDay();
    weekdays.add(day);
    if (day === 0 || day === 6) hasWeekend = true;
  }
  if (!hasWeekend && weekdays.size <= 5) {
    const onlyWeekdays = [...weekdays].every((d) => d >= 1 && d <= 5);
    if (onlyWeekdays && weekdays.size >= 4) return "Monday–Friday";
  }
  if (dates.length >= 2) {
    const sorted = [...dates].sort();
    const gaps = new Set<number>();
    for (let i = 1; i < sorted.length; i++) {
      const a = parseISO(sorted[i - 1]);
      const b = parseISO(sorted[i]);
      const diff = Math.round(
        (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24),
      );
      gaps.add(diff);
    }
    if (gaps.size === 1 && gaps.has(7)) return "Weekly";
  }
  return "Recurring";
}

export async function getRecurringScheduleSummaries(): Promise<
  RecurringScheduleSummary[]
> {
  const templates = await listSessionTemplates({ includeInactive: false });
  if (
    !isSupabaseConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    templates.length === 0
  ) {
    return templates.map((t) => ({
      template_id: t.id,
      class_name: classCardHeading(t.program),
      calendar_color: t.program?.calendar_color ?? null,
      time_label: classTimeLabel(t),
      start_time: normalizeTime(t.default_start_time),
      session_count: 0,
      start_date: null,
      end_date: null,
      recurrence_label: "—",
      has_schedule: false,
    }));
  }

  const supabase = createTrainingServiceClient();
  const templateIds = templates.map((t) => t.id);
  const { data: rows, error } = await supabase
    .from(DAWG_TABLES.sessions)
    .select("id, template_id, session_date, start_time, status")
    .in("template_id", templateIds)
    .neq("status", "cancelled");

  if (error || !rows) {
    return templates.map((t) => ({
      template_id: t.id,
      class_name: classCardHeading(t.program),
      calendar_color: t.program?.calendar_color ?? null,
      time_label: classTimeLabel(t),
      start_time: normalizeTime(t.default_start_time),
      session_count: 0,
      start_date: null,
      end_date: null,
      recurrence_label: "—",
      has_schedule: false,
    }));
  }

  return templates.map((template) => {
    const startNorm = normalizeTime(template.default_start_time);
    const matching = rows.filter(
      (r) =>
        r.template_id === template.id &&
        normalizeTime(String(r.start_time)) === startNorm,
    );
    const dates = matching
      .map((r) => r.session_date as string)
      .sort((a, b) => a.localeCompare(b));

    return {
      template_id: template.id,
      class_name: classCardHeading(template.program),
      calendar_color: template.program?.calendar_color ?? null,
      time_label: classTimeLabel(template),
      start_time: startNorm,
      session_count: dates.length,
      start_date: dates[0] ?? null,
      end_date: dates[dates.length - 1] ?? null,
      recurrence_label: inferRecurrenceLabel(dates),
      has_schedule: dates.length > 0,
    };
  });
}

export async function endRecurringScheduleEarly(input: {
  templateId: string;
  lastDate: string;
}): Promise<{ ok: true; cancelled: number } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable" };
  }

  const supabase = createTrainingServiceClient();
  const { data, error } = await supabase
    .from(DAWG_TABLES.sessions)
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("template_id", input.templateId)
    .gt("session_date", input.lastDate)
    .neq("status", "cancelled")
    .select("id");

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, cancelled: data?.length ?? 0 };
}

export async function extendRecurringSchedule(input: {
  templateId: string;
  newEndDate: string;
}): Promise<
  | { ok: true; created: number }
  | { ok: false; error: string }
> {
  const supabase = isSupabaseConfigured()
    ? createTrainingServiceClient()
    : null;
  let startDate = format(new Date(), "yyyy-MM-dd");

  if (supabase) {
    const { data } = await supabase
      .from(DAWG_TABLES.sessions)
      .select("session_date")
      .eq("template_id", input.templateId)
      .neq("status", "cancelled")
      .order("session_date", { ascending: false })
      .limit(1);
    if (data?.[0]?.session_date) {
      const last = parseISO(data[0].session_date as string);
      startDate = format(addDays(last, 1), "yyyy-MM-dd");
    }
  }

  if (startDate > input.newEndDate) {
    return {
      ok: false,
      error: "New end date must be after the last scheduled session.",
    };
  }

  const result = await scheduleTemplateOccurrences(input.templateId, {
    mode: "repeating",
    session_date: startDate,
    recurrence: "weekdays",
    recurrence_weeks: 52,
    end_date: input.newEndDate,
    recurrence_days: [],
    skip_duplicates: true,
    status: "published",
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, created: result.ids.length };
}

export async function replaceRecurringScheduleTime(input: {
  templateId: string;
  effectiveDate: string;
  newStartTime: string;
  durationMinutes?: number;
}): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable" };
  }

  const startTime = normalizeTime(input.newStartTime);
  const duration = input.durationMinutes ?? 60;
  const endTime = normalizeTime(
    endTimeFromStart(timeToHHMM(startTime), duration),
  );

  const supabase = createTrainingServiceClient();
  const { data, error } = await supabase
    .from(DAWG_TABLES.sessions)
    .update({
      start_time: startTime,
      end_time: endTime,
      updated_at: new Date().toISOString(),
    })
    .eq("template_id", input.templateId)
    .gte("session_date", input.effectiveDate)
    .neq("status", "cancelled")
    .select("id");

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase
    .from(DAWG_TABLES.sessionTemplates)
    .update({
      default_start_time: startTime,
      default_duration_minutes: duration,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.templateId);

  return { ok: true, updated: data?.length ?? 0 };
}
