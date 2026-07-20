import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import type { PaymentMethod, PaymentStatus } from "@/lib/types/database";

export type BookingPackageRedemption = {
  bookingId: string;
  packageName: string;
};

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

export function adminPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "not_required":
      return "No payment";
    case "unpaid":
      return "Unpaid";
    case "pending":
      return "Pending";
    case "paid":
      return "Paid";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Partial refund";
    default:
      return String(status).replaceAll("_", " ");
  }
}

/** Staff-facing label for how this session is covered (not raw payment_method). */
export function adminBookingPaymentTypeLabel(input: {
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  packageName?: string | null;
}): string {
  if (input.packageName) {
    return `Package · ${input.packageName}`;
  }
  if (input.paymentMethod === "package_credit") {
    return "Package credit";
  }
  if (input.paymentStatus === "not_required") {
    return "Roster session";
  }
  if (input.paymentMethod === "stripe") {
    return "Pay online";
  }
  if (input.paymentMethod === "pay_at_facility") {
    return "Pay at facility";
  }
  return "—";
}
