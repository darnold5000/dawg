import type { AttendanceStatus } from "@/lib/types/database";

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "registered",
  "attended",
  "no_show",
  "cancelled",
];

export function attendanceLabel(status: AttendanceStatus): string {
  switch (status) {
    case "registered":
      return "Registered";
    case "attended":
      return "Attended";
    case "no_show":
      return "No show";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function attendanceTone(
  status: AttendanceStatus,
): "neutral" | "success" | "warning" | "danger" {
  switch (status) {
    case "attended":
      return "success";
    case "no_show":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}
