import { ageRangeLabel } from "@/lib/format";

/** Public grade groupings (replaces age ranges for core programs). */
export const PROGRAM_GRADE_RANGES: Record<string, string> = {
  "little-dawgs": "2nd Grade – 6th Grade",
  "big-dawgs": "7th Grade – Collegiate",
};

export const GRADE_PLACEMENT_NOTE =
  "Some 6th graders may participate in Big Dawgs with coach and parent approval.";

export function gradeRangeLabelForProgramSlug(
  slug: string | null | undefined,
): string | null {
  if (!slug) return null;
  return PROGRAM_GRADE_RANGES[slug] ?? null;
}

export function audienceLabelForProgram(program: {
  slug: string;
  minimum_age?: number | null;
  maximum_age?: number | null;
}): string {
  return (
    gradeRangeLabelForProgramSlug(program.slug) ??
    ageRangeLabel(program.minimum_age, program.maximum_age)
  );
}

export function audienceLabelForSession(session: {
  minimum_age?: number | null;
  maximum_age?: number | null;
  program?: { slug: string } | null;
}): string {
  const byProgram = gradeRangeLabelForProgramSlug(session.program?.slug);
  if (byProgram) return byProgram;
  return ageRangeLabel(session.minimum_age, session.maximum_age);
}

export function isGradeGroupedProgram(slug: string | null | undefined): boolean {
  return Boolean(slug && slug in PROGRAM_GRADE_RANGES);
}
