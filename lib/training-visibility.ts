/** Session / template audience visibility (platform-wide vocabulary). */
export const TRAINING_VISIBILITY_VALUES = [
  "public",
  "private",
  "members_only",
  "hidden",
  "waitlist_only",
] as const;

export type TrainingVisibility = (typeof TRAINING_VISIBILITY_VALUES)[number];

export const TRAINING_VISIBILITY_LABELS: Record<TrainingVisibility, string> = {
  public: "Public",
  private: "Private",
  members_only: "Members only",
  hidden: "Hidden",
  waitlist_only: "Waitlist only",
};

export function isTrainingVisibility(value: string): value is TrainingVisibility {
  return (TRAINING_VISIBILITY_VALUES as readonly string[]).includes(value);
}

/** Public schedule shows only public occurrences (legacy rows with null visibility count as public). */
export function isPublicScheduleVisibility(
  visibility: TrainingVisibility | null | undefined,
): boolean {
  return visibility == null || visibility === "public";
}

export function visibilityLabel(
  visibility: TrainingVisibility | null | undefined,
): string {
  if (visibility == null) return "Public (default)";
  return TRAINING_VISIBILITY_LABELS[visibility];
}
