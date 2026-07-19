import { format, parse, parseISO } from "date-fns";

export function formatSessionDate(date: string): string {
  return format(parseISO(date), "EEEE, MMMM d");
}

export function formatSessionDateShort(date: string): string {
  return format(parseISO(date), "EEE, MMM d");
}

export function formatSessionTime(time: string): string {
  const normalized = time.length === 5 ? `${time}:00` : time.slice(0, 8);
  return format(parse(normalized, "HH:mm:ss", new Date()), "h:mm a");
}

/** Format integer cents as USD. Prefer this for all DAWG prices. */
export function formatPrice(cents: number): string {
  const fractionDigits = cents % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: fractionDigits,
  }).format(cents / 100);
}

export function ageRangeLabel(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min != null && max != null) return `Ages ${min}–${max}`;
  if (min != null) return `Ages ${min}+`;
  if (max != null) return `Ages up to ${max}`;
  return "All ages";
}

export function durationMinutes(start: string, end: string): number {
  const s = parse(start.slice(0, 8), "HH:mm:ss", new Date());
  const e = parse(end.slice(0, 8), "HH:mm:ss", new Date());
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000));
}

export function generateConfirmationNumber(): string {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `DAWG-${stamp}${part}`;
}

export function athleteAgeFromDob(dob: string, onDate = new Date()): number {
  const birth = parseISO(dob);
  let age = onDate.getFullYear() - birth.getFullYear();
  const m = onDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && onDate.getDate() < birth.getDate())) age -= 1;
  return age;
}
