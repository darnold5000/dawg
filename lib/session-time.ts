/** Time helpers shared by session and template scheduling forms. */

export function normalizeTime(value: string): string {
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value.slice(0, 8);
}

export function endTimeFromStart(
  startHHMM: string,
  durationMinutes: number,
): string {
  const [h, m] = startHHMM.split(":").map(Number);
  const total = h * 60 + m + durationMinutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function timeToHHMM(value: string): string {
  return value.slice(0, 5);
}
