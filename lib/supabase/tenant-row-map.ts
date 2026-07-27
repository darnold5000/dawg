import type { Athlete, Parent } from "@/lib/types/database";

export function parentIdFromRow(
  row: { guardian_id?: string | null; parent_id?: string | null } | null | undefined,
): string | null {
  if (!row) return null;
  const id = row.guardian_id ?? row.parent_id;
  return id != null ? String(id) : null;
}

export function mapAthleteRow(row: Record<string, unknown>): Athlete {
  const parent_id = parentIdFromRow(row as { guardian_id?: string; parent_id?: string });
  return {
    ...(row as unknown as Athlete),
    parent_id: parent_id ?? "",
  };
}

export function mapParentRow(row: Record<string, unknown>): Parent {
  return row as unknown as Parent;
}

export { mapBookingRow, mapBookingRows, relationParent } from "@/lib/supabase/booking-map";
