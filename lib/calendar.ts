import { SITE } from "@/lib/constants";

export function googleCalendarUrl(input: {
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  details?: string;
}): string {
  const start = `${input.sessionDate.replace(/-/g, "")}T${input.startTime.replace(/:/g, "").slice(0, 6)}`;
  const end = `${input.sessionDate.replace(/-/g, "")}T${input.endTime.replace(/:/g, "").slice(0, 6)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${start}/${end}`,
    details: input.details ?? SITE.name,
    location: input.location ?? SITE.address.full,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
