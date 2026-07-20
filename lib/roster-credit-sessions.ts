const ROSTER_CREDIT_PROGRAM_SLUGS = new Set(["little-dawgs", "big-dawgs"]);

/** Group classes booked on the roster; package credits are tracked manually by staff. */
export function isRosterCreditSession(session: {
  program?: { slug?: string } | null;
}): boolean {
  const slug = session.program?.slug;
  return slug != null && ROSTER_CREDIT_PROGRAM_SLUGS.has(slug);
}
