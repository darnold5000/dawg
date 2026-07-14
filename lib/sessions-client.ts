import { addDays, format, parse } from "date-fns";

function normalizeTime(value: string): string {
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value.slice(0, 8);
}

/** Browser-safe slot generator (no server imports). */
export function generatePrivateSlots(input: {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  bufferMinutes: number;
}): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const day = parse(input.date, "yyyy-MM-dd", new Date());
  let cursor = parse(normalizeTime(input.startTime), "HH:mm:ss", day);
  const end = parse(normalizeTime(input.endTime), "HH:mm:ss", day);

  while (cursor.getTime() + input.durationMinutes * 60_000 <= end.getTime()) {
    const slotEnd = new Date(cursor.getTime() + input.durationMinutes * 60_000);
    slots.push({
      start: format(cursor, "HH:mm:ss"),
      end: format(slotEnd, "HH:mm:ss"),
    });
    cursor = new Date(slotEnd.getTime() + input.bufferMinutes * 60_000);
  }

  return slots;
}

export function addDaysISO(date: string, days: number): string {
  return format(addDays(parse(date, "yyyy-MM-dd", new Date()), days), "yyyy-MM-dd");
}
