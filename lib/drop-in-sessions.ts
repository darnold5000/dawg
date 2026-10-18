/** Strength Development: parents buy the 12-week package, then show up. */
export const DROP_IN_PROGRAM_SLUGS = new Set(["strength-development"]);

export const TWELVE_WEEK_PACKAGE_SLUG = "twelve-week";

/** Calendar listing only. No per-session price, booking, or waitlist. */
export function isDropInSession(session: {
  program?: { slug?: string } | null;
}): boolean {
  const slug = session.program?.slug;
  return slug != null && DROP_IN_PROGRAM_SLUGS.has(slug);
}
