import { formatSessionTime } from "@/lib/format";
import { timeToHHMM } from "@/lib/session-time";
import type {
  Program,
  SessionTemplateWithRelations,
  Trainer,
} from "@/lib/types/database";

/** Title on the calendar — program name, not redundant template label. */
export function classSessionTitle(
  template: Pick<SessionTemplateWithRelations, "name" | "program">,
): string {
  return template.program?.name?.trim() || template.name.trim();
}

export function classCardHeading(program: Program | null | undefined): string {
  return program?.name?.trim() || "Class";
}

export function classCardMeta(
  template: SessionTemplateWithRelations,
  trainer?: Trainer | null,
): string {
  const parts = [
    formatSessionTime(template.default_start_time),
    `${template.default_duration_minutes} min`,
  ];
  const coach = trainer?.name ?? template.trainer?.name;
  if (coach) parts.push(coach);
  return parts.join(" · ");
}

export function classTimeLabel(template: SessionTemplateWithRelations): string {
  return formatSessionTime(template.default_start_time);
}

export function classListSortKey(template: SessionTemplateWithRelations): string {
  const programOrder = template.program?.display_order ?? 0;
  const time = timeToHHMM(template.default_start_time);
  return `${programOrder}-${time}-${template.id}`;
}
