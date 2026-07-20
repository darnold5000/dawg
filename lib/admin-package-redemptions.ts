import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";

/** Batch lookup: which bookings redeemed a package credit. */
export async function getPackageRedemptionsForBookings(
  bookingIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = [...new Set(bookingIds.filter(Boolean))];
  if (
    ids.length === 0 ||
    !isSupabaseConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return map;
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.packageRedemptions)
    .select(
      `
      booking_id,
      purchase:dawg_package_purchases (
        package:dawg_packages ( name )
      )
    `,
    )
    .in("booking_id", ids);

  for (const row of data ?? []) {
    const bookingId = row.booking_id as string;
    const name =
      (row.purchase as { package?: { name?: string } | null } | null)?.package
        ?.name ?? "Package";
    map.set(bookingId, name);
  }

  return map;
}
