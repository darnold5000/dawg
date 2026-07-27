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

export type Meridiem = "AM" | "PM";

/** 24h HH:MM → 12h clock parts for admin time pickers. */
export function hhmmTo12Parts(hhmm: string): {
  hour12: number;
  minute: number;
  meridiem: Meridiem;
} {
  const [h24, minute] = hhmm.slice(0, 5).split(":").map(Number);
  const meridiem: Meridiem = h24 >= 12 ? "PM" : "AM";
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, meridiem };
}

export function parts12ToHHMM(
  hour12: number,
  minute: number,
  meridiem: Meridiem,
): string {
  let h24: number;
  if (hour12 === 12) {
    h24 = meridiem === "AM" ? 0 : 12;
  } else {
    h24 = meridiem === "AM" ? hour12 : hour12 + 12;
  }
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
