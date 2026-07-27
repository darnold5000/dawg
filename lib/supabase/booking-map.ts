import type { Booking } from "@/lib/types/database";

/** Map training_session_bookings.guardian_id to legacy Booking.parent_id shape. */
export function mapBookingRow(
  row: Record<string, unknown> | null,
): Booking | null {
  if (!row) return null;
  const guardianId = row.guardian_id ?? row.parent_id;
  return {
    ...(row as unknown as Booking),
    parent_id: String(guardianId),
  };
}

export function mapBookingRows(
  rows: Record<string, unknown>[] | null,
): Booking[] {
  return (rows ?? []).map((r) => mapBookingRow(r)!);
}

/** Nested relation from PostgREST (guardian or legacy parent alias). */
export function relationParent(
  row: Record<string, unknown>,
): Record<string, unknown> | null {
  const g = row.guardian ?? row.parent;
  return (g as Record<string, unknown>) ?? null;
}
