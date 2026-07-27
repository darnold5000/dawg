import type { Athlete, PackagePurchase, Parent } from "@/lib/types/database";

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

export function mapPackagePurchaseRow(
  row: Record<string, unknown>,
): PackagePurchase {
  const parent_id = parentIdFromRow(
    row as { guardian_id?: string; parent_id?: string },
  );
  return {
    ...(row as unknown as PackagePurchase),
    parent_id: parent_id ?? "",
  };
}

export function mapPackagePurchaseRows(
  rows: Record<string, unknown>[] | null,
): PackagePurchase[] {
  return (rows ?? []).map((r) => mapPackagePurchaseRow(r));
}

export { mapBookingRow, mapBookingRows, relationParent } from "@/lib/supabase/booking-map";
