import { SITE } from "@/lib/constants";

export type CalendarEventInput = {
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  details?: string;
  /** Used in ICS UID for stable calendar updates. */
  uid?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local wall-clock as YYYYMMDDTHHMMSS (no Z — matches venue local time). */
function localStamp(date: string, time: string): string {
  const t = time.length === 5 ? `${time}:00` : time.slice(0, 8);
  return `${date.replace(/-/g, "")}T${t.replace(/:/g, "")}`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

export function buildIcsCalendar(event: CalendarEventInput): string {
  const dtStart = localStamp(event.sessionDate, event.startTime);
  const dtEnd = localStamp(event.sessionDate, event.endTime);
  const stamp = new Date();
  const dtStamp = `${stamp.getUTCFullYear()}${pad(stamp.getUTCMonth() + 1)}${pad(stamp.getUTCDate())}T${pad(stamp.getUTCHours())}${pad(stamp.getUTCMinutes())}${pad(stamp.getUTCSeconds())}Z`;
  const uid =
    event.uid ??
    `${dtStart}-${event.title.replace(/\s+/g, "-").toLowerCase()}@dawg`;
  const location = event.location ?? SITE.address.full;
  const description = event.details ?? SITE.name;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DAWG Youth Training//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function icsDataUrl(event: CalendarEventInput): string {
  const ics = buildIcsCalendar(event);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function googleCalendarUrl(event: CalendarEventInput): string {
  const start = localStamp(event.sessionDate, event.startTime);
  const end = localStamp(event.sessionDate, event.endTime);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.details ?? SITE.name,
    location: event.location ?? SITE.address.full,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Outlook.com compose deeplink (ISO local timestamps). */
export function outlookCalendarUrl(event: CalendarEventInput): string {
  const startTime =
    event.startTime.length === 5
      ? `${event.startTime}:00`
      : event.startTime.slice(0, 8);
  const endTime =
    event.endTime.length === 5
      ? `${event.endTime}:00`
      : event.endTime.slice(0, 8);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: `${event.sessionDate}T${startTime}`,
    enddt: `${event.sessionDate}T${endTime}`,
    subject: event.title,
    body: event.details ?? SITE.name,
    location: event.location ?? SITE.address.full,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function appleCalendarHref(event: CalendarEventInput): string {
  return icsDataUrl(event);
}

export function calendarDetailsLine(input: {
  athleteName?: string;
  confirmationNumber?: string;
  coachName?: string | null;
}): string {
  const bits: string[] = [SITE.name];
  if (input.athleteName) bits.push(`Athlete: ${input.athleteName}`);
  if (input.coachName) bits.push(`Coach: ${input.coachName}`);
  if (input.confirmationNumber) {
    bits.push(`Confirmation: ${input.confirmationNumber}`);
  }
  return bits.join("\n");
}
