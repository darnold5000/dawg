import { addWeeks } from "date-fns";

export function creditsValidUntilFromPaidAt(
  paidAt: string | Date,
  validityWeeks: number,
): string {
  return addWeeks(new Date(paidAt), validityWeeks).toISOString();
}

export function creditsValidUntilForPackage(
  paidAtIso: string,
  packageRow: { validity_weeks?: number | null } | null | undefined,
): string | null {
  const weeks = packageRow?.validity_weeks;
  if (weeks == null || weeks <= 0) return null;
  return creditsValidUntilFromPaidAt(paidAtIso, weeks);
}

export function isPackageCreditExpired(
  purchase: { credits_valid_until?: string | null },
  nowMs = Date.now(),
): boolean {
  const until = purchase.credits_valid_until;
  if (!until) return false;
  return new Date(until).getTime() <= nowMs;
}
