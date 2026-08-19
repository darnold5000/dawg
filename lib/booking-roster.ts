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

export type OccupancyBooking = {
  status: string;
  payment_method?: string | null;
  payment_status?: string | null;
  attendance_status?: string | null;
  booking_expires_at?: string | null;
  nowMs?: number;
};

export type SessionOccupancy = {
  confirmedCount: number;
  pendingHoldCount: number;
  occupiedCount: number;
  availableCapacity: number;
};

/** True when the row still reserves a seat (confirmed OR active Stripe hold). */
export function occupiesCapacity(booking: OccupancyBooking): boolean {
  if (INACTIVE_ROSTER_STATUSES.has(booking.status)) return false;
  if (booking.attendance_status === "cancelled") return false;
  if (booking.status === "confirmed") return true;
  if (booking.status !== "pending") return false;
  if (!booking.booking_expires_at) return true;
  const now = booking.nowMs ?? Date.now();
  return new Date(booking.booking_expires_at).getTime() > now;
}

/**
 * Capacity occupancy. Includes unpaid Stripe holds so the last seat cannot
 * be oversold. Does not mean the athlete is booked.
 */
export function isActiveRosterBooking(booking: OccupancyBooking): boolean {
  return occupiesCapacity(booking);
}

/** Confirmed registration — the athlete is actually booked. */
export function isConfirmedRosterBooking(booking: OccupancyBooking): boolean {
  if (INACTIVE_ROSTER_STATUSES.has(booking.status)) return false;
  if (booking.attendance_status === "cancelled") return false;
  return booking.status === "confirmed";
}

/**
 * Temporary Stripe payment hold. Occupies capacity but is not a booking.
 */
export function isAwaitingPaymentHold(booking: OccupancyBooking): boolean {
  if (booking.status !== "pending") return false;
  if (booking.payment_method && booking.payment_method !== "stripe") {
    return false;
  }
  return occupiesCapacity(booking);
}

export function occupancyFromSession(session: {
  capacity: number;
  confirmed_count?: number;
  pending_hold_count?: number;
  booked_count?: number;
  spots_remaining?: number;
}): SessionOccupancy {
  const pendingHoldCount = session.pending_hold_count ?? 0;
  const confirmedCount =
    session.confirmed_count ??
    Math.max(0, (session.booked_count ?? 0) - pendingHoldCount);
  const occupiedCount = confirmedCount + pendingHoldCount;
  return {
    confirmedCount,
    pendingHoldCount,
    occupiedCount,
    availableCapacity:
      session.spots_remaining ?? Math.max(0, session.capacity - occupiedCount),
  };
}

export function summarizeSessionOccupancy(
  bookings: OccupancyBooking[],
  capacity: number,
  nowMs = Date.now(),
): SessionOccupancy {
  let confirmedCount = 0;
  let pendingHoldCount = 0;
  for (const booking of bookings) {
    const row = { ...booking, nowMs };
    if (isConfirmedRosterBooking(row)) confirmedCount += 1;
    else if (isAwaitingPaymentHold(row)) pendingHoldCount += 1;
  }
  const occupiedCount = confirmedCount + pendingHoldCount;
  return {
    confirmedCount,
    pendingHoldCount,
    occupiedCount,
    availableCapacity: Math.max(0, capacity - occupiedCount),
  };
}

export function staffOccupancyLabel(
  occupancy: Pick<
    SessionOccupancy,
    "confirmedCount" | "pendingHoldCount" | "availableCapacity"
  >,
  capacity: number,
): string {
  if (occupancy.pendingHoldCount > 0) {
    return `${occupancy.confirmedCount} confirmed · ${occupancy.pendingHoldCount} awaiting payment · ${occupancy.availableCapacity} available`;
  }
  return `${occupancy.confirmedCount}/${capacity} booked`;
}

export function publicOccupancyLabel(
  occupancy: Pick<
    SessionOccupancy,
    "confirmedCount" | "pendingHoldCount" | "availableCapacity"
  >,
  capacity: number,
  full: boolean,
): { primary: string; title: string } {
  if (full) {
    return {
      primary: occupancy.pendingHoldCount
        ? `${occupancy.confirmedCount} booked · ${occupancy.pendingHoldCount} held`
        : `${occupancy.confirmedCount}/${capacity} booked`,
      title: "Class full",
    };
  }
  if (occupancy.pendingHoldCount > 0) {
    return {
      primary: `${occupancy.confirmedCount} booked · ${occupancy.pendingHoldCount} spot${occupancy.pendingHoldCount === 1 ? "" : "s"} temporarily held`,
      title: `${occupancy.confirmedCount} booked, ${occupancy.pendingHoldCount} temporarily held, ${occupancy.availableCapacity} available`,
    };
  }
  return {
    primary: `${occupancy.confirmedCount}/${capacity} booked`,
    title: `${occupancy.confirmedCount} booked, ${occupancy.availableCapacity} spots available`,
  };
}

export function bookingStatusDisplayLabel(booking: OccupancyBooking): string {
  if (isAwaitingPaymentHold(booking)) return "Awaiting payment";
  if (booking.status === "confirmed") return "Confirmed";
  if (booking.status === "expired") return "Expired";
  if (booking.status === "cancelled") return "Cancelled";
  return booking.status.replaceAll("_", " ");
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
