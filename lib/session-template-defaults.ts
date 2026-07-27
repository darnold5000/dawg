import type { Program, SessionTemplate } from "@/lib/types/database";
import { SITE } from "@/lib/constants";
import type { TrainingVisibility } from "@/lib/training-visibility";

/** Defaults for new templates from a program row (client-safe). */
export function templateDefaultsFromProgram(program: Program | undefined) {
  return {
    default_duration_minutes:
      program?.default_duration_minutes ?? SITE.defaultSessionDurationMinutes,
    default_capacity: program?.default_capacity ?? 10,
    default_price_cents: program?.default_price_cents ?? 0,
    calendar_color: program?.calendar_color ?? "#2563eb",
    default_visibility:
      (program?.default_visibility as TrainingVisibility | null) ?? "public",
  };
}

export type EffectiveTemplateDefaults = {
  duration_minutes: number;
  capacity: number;
  price_cents: number;
  visibility: TrainingVisibility;
  calendar_color: string;
};

/** Program owns defaults; template fields override only when set. */
export function effectiveTemplateDefaults(
  program: Program | null | undefined,
  template: Pick<
    SessionTemplate,
    | "default_duration_minutes"
    | "default_capacity"
    | "default_price_cents"
    | "default_visibility"
  >,
): EffectiveTemplateDefaults {
  const base = templateDefaultsFromProgram(program ?? undefined);
  return {
    duration_minutes:
      template.default_duration_minutes ?? base.default_duration_minutes,
    capacity: template.default_capacity ?? base.default_capacity,
    price_cents: template.default_price_cents ?? base.default_price_cents,
    visibility:
      (template.default_visibility as TrainingVisibility | null) ??
      base.default_visibility,
    calendar_color: program?.calendar_color ?? base.calendar_color,
  };
}
