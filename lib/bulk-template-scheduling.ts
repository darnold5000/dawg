import { z } from "zod";
import {
  previewTemplateOccurrences,
  scheduleTemplateOccurrences,
  templateScheduleSchema,
} from "@/lib/template-scheduling";
import { getSessionTemplate } from "@/lib/session-templates";
import { classCardHeading } from "@/lib/class-display";

export const bulkWeekdayScheduleSchema = z.object({
  template_ids: z.array(z.string().uuid()).min(1),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  skip_duplicates: z.boolean().optional().default(true),
});

export type BulkWeekdayScheduleInput = z.infer<typeof bulkWeekdayScheduleSchema>;

export type BulkScheduleLinePreview = {
  template_id: string;
  template_name: string;
  program_name: string | null;
  count: number;
  conflicts: number;
};

export type BulkSchedulePreview = {
  total_count: number;
  lines: BulkScheduleLinePreview[];
  errors: string[];
};

function weekdayPayload(
  input: BulkWeekdayScheduleInput,
): z.infer<typeof templateScheduleSchema> {
  return {
    mode: "repeating",
    session_date: input.session_date,
    recurrence: "weekdays",
    recurrence_weeks: 52,
    end_date: input.end_date,
    recurrence_days: [],
    skip_duplicates: input.skip_duplicates,
    status: "published",
  };
}

export async function previewBulkWeekdaySchedule(
  input: BulkWeekdayScheduleInput,
): Promise<BulkSchedulePreview> {
  const parsed = bulkWeekdayScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      total_count: 0,
      lines: [],
      errors: parsed.error.issues.map((i) => i.message),
    };
  }

  const payload = weekdayPayload(parsed.data);
  const lines: BulkScheduleLinePreview[] = [];
  const errors: string[] = [];
  let total = 0;

  for (const templateId of parsed.data.template_ids) {
    const template = await getSessionTemplate(templateId);
    const label = template
      ? `${classCardHeading(template.program)} · ${template.default_start_time.slice(0, 5)}`
      : "Class";

    const previewResult = await previewTemplateOccurrences(templateId, payload);
    if (!("count" in previewResult)) {
      errors.push(...previewResult.errors);
      continue;
    }
    const preview = previewResult;
    lines.push({
      template_id: templateId,
      template_name: label,
      program_name: template?.program?.name ?? null,
      count: preview.count,
      conflicts: preview.conflicts.length,
    });
    total += preview.count;
  }

  return { total_count: total, lines, errors };
}

export async function runBulkWeekdaySchedule(
  input: BulkWeekdayScheduleInput,
  createdBy?: string | null,
): Promise<
  | { ok: true; total_count: number; lines: BulkScheduleLinePreview[] }
  | { ok: false; error: string; preview?: BulkSchedulePreview }
> {
  const parsed = bulkWeekdayScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid schedule",
    };
  }

  const preview = await previewBulkWeekdaySchedule(parsed.data);
  if (preview.errors.length > 0 && preview.total_count === 0) {
    return { ok: false, error: preview.errors.join(" "), preview };
  }

  const payload = weekdayPayload(parsed.data);
  let total = 0;
  const lines: BulkScheduleLinePreview[] = [];

  for (const templateId of parsed.data.template_ids) {
    const template = await getSessionTemplate(templateId);
    const label = template
      ? `${classCardHeading(template.program)} · ${template.default_start_time.slice(0, 5)}`
      : "Class";

    const result = await scheduleTemplateOccurrences(
      templateId,
      payload,
      createdBy,
    );
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        preview,
      };
    }
    total += result.ids.length;
    lines.push({
      template_id: templateId,
      template_name: label,
      program_name: template?.program?.name ?? null,
      count: result.ids.length,
      conflicts: result.preview.conflicts.length,
    });
  }

  return { ok: true, total_count: total, lines };
}
