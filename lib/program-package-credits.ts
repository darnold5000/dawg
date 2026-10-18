import { filterEligibleCreditsForAthlete } from "@/lib/package-credit-eligibility";
import type { PackagePurchaseWithPackage } from "@/lib/types/database";

export const STRENGTH_DEVELOPMENT_PROGRAM_SLUG = "strength-development";

export const TWELVE_WEEK_PACKAGE_SLUG = "twelve-week";

export const SESSION_PACK_SLUGS = ["single", "pack-10", "pack-20"] as const;

export type SessionPackSlug = (typeof SESSION_PACK_SLUGS)[number];

/** Which package catalog slugs can cover a booking for this program. */
export function allowedPackageSlugsForProgram(
  programSlug: string | null | undefined,
): readonly string[] {
  if (programSlug === STRENGTH_DEVELOPMENT_PROGRAM_SLUG) {
    return [TWELVE_WEEK_PACKAGE_SLUG, ...SESSION_PACK_SLUGS];
  }
  return SESSION_PACK_SLUGS;
}

/** Strength: book only with 12-week or session-pack balance (no per-session Stripe). */
export function requiresPackageCreditToBook(
  programSlug: string | null | undefined,
): boolean {
  return programSlug === STRENGTH_DEVELOPMENT_PROGRAM_SLUG;
}

/** Hide per-session price on schedule; pay via packages, not at booking. */
export function isZeroPriceAtBookingProgram(
  program: { slug?: string } | null | undefined,
): boolean {
  return program?.slug === STRENGTH_DEVELOPMENT_PROGRAM_SLUG;
}

export function filterPurchasesByProgramSlug<
  T extends PackagePurchaseWithPackage,
>(purchases: T[], programSlug: string | null | undefined): T[] {
  const allowed = new Set(allowedPackageSlugsForProgram(programSlug));
  return purchases.filter(
    (p) => p.package?.slug != null && allowed.has(p.package.slug),
  );
}

export function filterEligiblePurchasesForProgramBooking<
  T extends PackagePurchaseWithPackage,
>(
  purchases: T[],
  programSlug: string | null | undefined,
  athleteId: string,
): T[] {
  const scoped = filterPurchasesByProgramSlug(purchases, programSlug);
  return filterEligibleCreditsForAthlete(scoped, athleteId);
}
