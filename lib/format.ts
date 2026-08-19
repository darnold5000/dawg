import { format, parse, parseISO } from "date-fns";
import { SITE } from "@/lib/constants";

export function formatSessionDate(date: string): string {
  return format(parseISO(date), "EEEE, MMMM d");
}

export function formatSessionDateShort(date: string): string {
  return format(parseISO(date), "EEE, MMM d");
}

/** Schedule list: MONDAY */
export function formatScheduleWeekday(date: string): string {
  return format(parseISO(date), "EEEE").toUpperCase();
}

export function formatScheduleDaySubdate(date: string): string {
  return format(parseISO(date), "MMMM d, yyyy");
}

export function formatScheduleDateRange(start: string, end: string): string {
  const s = parseISO(start);
  const e = parseISO(end);
  if (start === end) return format(s, "MMM d, yyyy");
  if (s.getFullYear() === e.getFullYear()) {
    return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
  }
  return `${format(s, "MMM d, yyyy")} – ${format(e, "MMM d, yyyy")}`;
}

export function formatSessionTime(time: string): string {
  const normalized = time.length === 5 ? `${time}:00` : time.slice(0, 8);
  return format(parse(normalized, "HH:mm:ss", new Date()), "h:mm a");
}

/**
 * Client/browser hold clock. Family dashboard is a Client Component, so this
 * uses the viewer's local timezone (Indiana for DAWG families).
 * Do not use this in Server Components — the server is UTC.
 */
export function formatHoldUntil(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = parseISO(iso);
  if (Number.isNaN(at.getTime())) return null;
  return format(at, "h:mm a");
}

/**
 * Admin/staff hold clock. Roster and booking pages are Server Components
 * (UTC on Vercel). Convert only for display; stored timestamptz is unchanged.
 */
export function formatAdminHoldUntil(
  iso: string | null | undefined,
): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE.timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(at);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value;
  if (!hour || !minute || !dayPeriod) return null;
  return `${hour}:${minute} ${dayPeriod}`;
}

/** Remaining hold time from the stored instant. No timezone conversion. */
export function holdRemainingMs(
  expiresAt: string | null | undefined,
  nowMs = Date.now(),
): number | null {
  if (!expiresAt) return null;
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return null;
  return at - nowMs;
}

export function formatHoldCountdown(remainingMs: number): string {
  const clamped = Math.max(0, remainingMs);
  const minutes = Math.floor(clamped / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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

/** Strip time-of-day suffixes from seeded session titles (e.g. "— Afternoon"). */
export function formatSessionTitle(title: string): string {
  return title
    .replace(/\s*[—–-]\s*(Afternoon|Evening|Late)\s*$/i, "")
    .trim();
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
