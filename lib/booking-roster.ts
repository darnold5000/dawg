import type { BookingStatus, PaymentStatus } from "@/lib/types/database";

export const REMOVE_FROM_SESSION_CONFIRMATION =
  "Remove this client from the session?\n\nThis will permanently remove the booking from the session roster. Use Cancel instead if you want to keep it in booking history.";

export type BookingFinancialSnapshot = {
  status: BookingStatus | string;
  payment_status: PaymentStatus | string;
  amount_paid_cents: number;
  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_charge_id?: string | null;
};

const INACTIVE_ROSTER_STATUSES = new Set([
  "cancelled",
  "expired",
  "waitlisted",
  "failed",
]);

export function isActiveRosterBooking(booking: {
  status: string;
  attendance_status?: string | null;
  booking_expires_at?: string | null;
  nowMs?: number;
}): boolean {
  if (INACTIVE_ROSTER_STATUSES.has(booking.status)) return false;
  if (booking.attendance_status === "cancelled") return false;
  if (booking.status === "confirmed") return true;
  if (booking.status !== "pending") return false;
  if (!booking.booking_expires_at) return true;
  const now = booking.nowMs ?? Date.now();
  return new Date(booking.booking_expires_at).getTime() > now;
}

export function hardDeleteBlockReason(
  booking: BookingFinancialSnapshot,
  extras?: { hasRedemption?: boolean; hasPaymentTransaction?: boolean },
): string | null {
  if (extras?.hasRedemption) {
    return "This booking has a package-credit redemption and cannot be permanently removed.";
  }
  if (extras?.hasPaymentTransaction) {
    return "This booking has a payment record and cannot be permanently removed. Cancel it to keep the history.";
  }
  if (
    booking.payment_status === "paid" ||
    booking.payment_status === "partially_refunded" ||
    booking.payment_status === "refunded"
  ) {
    return "Paid bookings cannot be permanently removed. Cancel the booking to keep payment history.";
  }
  if ((booking.amount_paid_cents ?? 0) > 0) {
    return "This booking has a recorded payment and cannot be permanently removed.";
  }
  if (booking.stripe_payment_intent_id || booking.stripe_charge_id) {
    return "This booking is linked to a Stripe payment and cannot be permanently removed.";
  }
  return null;
}

export function canHardDeleteBooking(
  booking: BookingFinancialSnapshot,
  extras?: { hasRedemption?: boolean; hasPaymentTransaction?: boolean },
): boolean {
  return hardDeleteBlockReason(booking, extras) == null;
}
