/**
 * Package-credit eligibility for a booking athlete.
 * Balances are checked only — never reserved, deducted, or redeemed here.
 */

export type PackageCreditLike = {
  status: string;
  sessions_remaining: number;
  athlete_id: string | null;
};

export function isEligiblePackageCredit(
  purchase: PackageCreditLike,
  athleteId: string,
): boolean {
  if (purchase.status !== "paid") return false;
  if (purchase.sessions_remaining <= 0) return false;
  return purchase.athlete_id == null || purchase.athlete_id === athleteId;
}

export function filterEligibleCreditsForAthlete<T extends PackageCreditLike>(
  purchases: T[],
  athleteId: string,
): T[] {
  return purchases.filter((purchase) =>
    isEligiblePackageCredit(purchase, athleteId),
  );
}

/** Credits are never mutated by booking, attendance, or cancellation. */
export const PACKAGE_CREDIT_AUTO_MUTATION = {
  booking: false,
  attendance: false,
  cancellation: false,
} as const;
