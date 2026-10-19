/**
 * Package-credit eligibility for a booking athlete.
 * Balances are checked only — never reserved, deducted, or redeemed here.
 */

import { isPackageCreditExpired } from "@/lib/package-credit-validity";

export type PackageCreditLike = {
  status: string;
  sessions_remaining: number;
  athlete_id: string | null;
  credits_valid_until?: string | null;
};

export function isUsablePackageCreditBalance(
  purchase: PackageCreditLike,
): boolean {
  if (purchase.status !== "paid") return false;
  if (purchase.sessions_remaining <= 0) return false;
  if (isPackageCreditExpired(purchase)) return false;
  return true;
}

export function isEligiblePackageCredit(
  purchase: PackageCreditLike,
  athleteId: string,
): boolean {
  if (!isUsablePackageCreditBalance(purchase)) return false;
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
