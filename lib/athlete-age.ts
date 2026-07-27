/** Age in whole years from YYYY-MM-DD, or null if invalid. */
export function ageFromIsoDate(
  dob: string,
  asOf: Date = new Date(),
): number | null {
  const trimmed = dob.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  const birth = new Date(y, m - 1, d);
  if (
    birth.getFullYear() !== y ||
    birth.getMonth() !== m - 1 ||
    birth.getDate() !== d
  ) {
    return null;
  }
  let age = asOf.getFullYear() - y;
  const monthDiff = asOf.getMonth() - (m - 1);
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < d)) {
    age -= 1;
  }
  return age;
}

/** Under 18 — parent/guardian contact required. Invalid DOB treated as minor. */
export function isMinorAthlete(dob: string): boolean {
  const age = ageFromIsoDate(dob);
  if (age === null) return true;
  return age < 18;
}
