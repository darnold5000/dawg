/**
 * Idempotent public-booking retry policy.
 * Unique index training_session_bookings_athlete_session_uidx remains the DB safety net.
 */
import { isActiveRosterBooking } from "@/lib/booking-roster";
import { PACKAGE_CREDIT_AUTO_MUTATION } from "@/lib/package-credit-eligibility";
import type { PaymentMethod } from "@/lib/types/database";

export const ALREADY_BOOKED_ERROR =
  "This athlete is already booked for this session.";
export const SESSION_FULL_ERROR = "This session is full.";

export type ExistingBookingSnapshot = {
  id: string;
  session_id: string;
  athlete_id: string;
  guardian_id?: string | null;
  parent_id?: string | null;
  status: string;
  payment_method: PaymentMethod | string | null;
  payment_status: string;
  booking_expires_at: string | null;
  stripe_checkout_session_id: string | null;
  confirmation_email_sent_at?: string | null;
  amount_paid_cents?: number;
};

export type CheckoutSessionSnapshot = {
  id: string;
  status: string;
  payment_status: string;
  url: string | null;
};

export type BookingRetryPlan =
  | {
      action: "create";
      sendConfirmationEmail: false;
    }
  | {
      action: "resume_stripe";
      bookingId: string;
      checkout: "reuse" | "replace" | "unknown";
      sendConfirmationEmail: false;
    }
  | {
      action: "expire_then_create";
      staleBookingId: string;
      expireCheckoutSessionId: string | null;
      sendConfirmationEmail: false;
    }
  | {
      action: "reject";
      code: "ALREADY_BOOKED" | "SESSION_FULL";
      error: string;
      httpStatus: 409;
    };

export type LatePaymentDecision =
  | { action: "already_confirmed" }
  | { action: "confirm" }
  | { action: "reject_late_no_capacity" };

export function isActivePendingStripeHold(
  booking: Pick<
    ExistingBookingSnapshot,
    "status" | "payment_method" | "booking_expires_at"
  >,
  nowMs = Date.now(),
): boolean {
  if (booking.status !== "pending") return false;
  if (booking.payment_method !== "stripe") return false;
  return isActiveRosterBooking({
    status: booking.status,
    booking_expires_at: booking.booking_expires_at,
    nowMs,
  });
}

export function isStalePendingStripeHold(
  booking: Pick<
    ExistingBookingSnapshot,
    "status" | "payment_method" | "booking_expires_at"
  >,
  nowMs = Date.now(),
): boolean {
  if (booking.status !== "pending") return false;
  if (booking.payment_method !== "stripe") return false;
  if (!booking.booking_expires_at) return false;
  return new Date(booking.booking_expires_at).getTime() <= nowMs;
}

export function checkoutReuseDecision(
  session: CheckoutSessionSnapshot | null,
): "reuse" | "replace" | "reconcile_paid" | "unknown" {
  if (!session) return "unknown";
  if (session.payment_status === "paid" || session.status === "complete") {
    return "reconcile_paid";
  }
  if (session.status === "open" && Boolean(session.url)) {
    return "reuse";
  }
  return "replace";
}

export function planBookingSubmit(input: {
  existing: ExistingBookingSnapshot | null;
  checkoutSession?: CheckoutSessionSnapshot | null;
  nowMs?: number;
}): BookingRetryPlan {
  const nowMs = input.nowMs ?? Date.now();
  const existing = input.existing;
  if (!existing) {
    return { action: "create", sendConfirmationEmail: false };
  }

  if (existing.status === "confirmed") {
    return {
      action: "reject",
      code: "ALREADY_BOOKED",
      error: ALREADY_BOOKED_ERROR,
      httpStatus: 409,
    };
  }

  if (isActivePendingStripeHold(existing, nowMs)) {
    const checkout = checkoutReuseDecision(input.checkoutSession ?? null);
    return {
      action: "resume_stripe",
      bookingId: existing.id,
      checkout:
        checkout === "reuse" || checkout === "replace" ? checkout : "unknown",
      sendConfirmationEmail: false,
    };
  }

  if (isStalePendingStripeHold(existing, nowMs)) {
    return {
      action: "expire_then_create",
      staleBookingId: existing.id,
      expireCheckoutSessionId: existing.stripe_checkout_session_id,
      sendConfirmationEmail: false,
    };
  }

  return { action: "create", sendConfirmationEmail: false };
}

export function planAfterUniqueCollision(input: {
  existing: ExistingBookingSnapshot | null;
  checkoutSession?: CheckoutSessionSnapshot | null;
  nowMs?: number;
}): BookingRetryPlan {
  const plan = planBookingSubmit(input);
  if (plan.action === "create") {
    return {
      action: "reject",
      code: "ALREADY_BOOKED",
      error: ALREADY_BOOKED_ERROR,
      httpStatus: 409,
    };
  }
  return plan;
}

export type RpcErrorLike = {
  message?: string | null;
  code?: string | null;
  details?: string | null;
};

export function mapBookingRpcError(error: RpcErrorLike | null | undefined): {
  code: string;
  error: string;
  httpStatus: number;
} {
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`;
  const pgCode = error?.code ?? "";

  if (message.includes("SESSION_FULL")) {
    return { code: "SESSION_FULL", error: SESSION_FULL_ERROR, httpStatus: 409 };
  }
  if (
    pgCode === "23505" ||
    message.includes("duplicate key") ||
    message.includes("unique") ||
    message.includes("training_session_bookings_athlete_session_uidx") ||
    message.includes("training_session_bookings_unique_athlete_session")
  ) {
    return {
      code: "ALREADY_BOOKED",
      error: ALREADY_BOOKED_ERROR,
      httpStatus: 409,
    };
  }
  if (message.includes("ONLINE_PAYMENT_NOT_ALLOWED")) {
    return {
      code: "ONLINE_PAYMENT_NOT_ALLOWED",
      error: "Online payment is not available for this session.",
      httpStatus: 400,
    };
  }
  if (message.includes("FACILITY_PAYMENT_NOT_ALLOWED")) {
    return {
      code: "FACILITY_PAYMENT_NOT_ALLOWED",
      error: "Online payment is required for this session.",
      httpStatus: 400,
    };
  }
  return {
    code: "BOOKING_FAILED",
    error: "Could not complete booking. Please try again.",
    httpStatus: 500,
  };
}

export function bookingErrorHttpStatus(code?: string): number {
  if (code === "SESSION_FULL" || code === "ALREADY_BOOKED") return 409;
  if (
    code === "INTAKE_REQUIRED" ||
    code === "WAIVER_RENEWAL_REQUIRED" ||
    code === "EMAIL_MISMATCH"
  ) {
    return 403;
  }
  if (code === "BOOKING_FAILED" || code === "INTERNAL_ERROR") {
    return 500;
  }
  return 400;
}

export function decideLatePaymentFulfillment(input: {
  status: string;
  paymentStatus: string;
  bookingExpiresAt: string | null;
  activeOtherSeats: number;
  capacity: number;
  nowMs?: number;
}): LatePaymentDecision {
  if (input.paymentStatus === "paid" && input.status === "confirmed") {
    return { action: "already_confirmed" };
  }

  const nowMs = input.nowMs ?? Date.now();
  const holdReleased =
    input.status === "expired" ||
    input.status === "cancelled" ||
    (input.status === "pending" &&
      Boolean(input.bookingExpiresAt) &&
      new Date(input.bookingExpiresAt as string).getTime() <= nowMs);

  if (holdReleased && input.activeOtherSeats >= input.capacity) {
    return { action: "reject_late_no_capacity" };
  }

  return { action: "confirm" };
}

export function countsAsSeat(
  booking: Pick<
    ExistingBookingSnapshot,
    "status" | "booking_expires_at"
  > & { attendance_status?: string | null },
  nowMs = Date.now(),
): boolean {
  return isActiveRosterBooking({
    status: booking.status,
    attendance_status: booking.attendance_status,
    booking_expires_at: booking.booking_expires_at,
    nowMs,
  });
}

export function duplicateSubmitMustNotConsumeCredit(): boolean {
  return PACKAGE_CREDIT_AUTO_MUTATION.booking === false;
}

export type BookingLogOutcome =
  | "created"
  | "resumed"
  | "stale_expired"
  | "checkout_reused"
  | "checkout_replaced"
  | "already_booked"
  | "session_full";

export function bookingLogPayload(
  outcome: BookingLogOutcome,
  fields: {
    bookingId?: string | null;
    sessionId?: string | null;
    athleteId?: string | null;
    guardianId?: string | null;
    checkoutSessionId?: string | null;
  },
): Record<string, string | null> {
  return {
    outcome,
    booking_id: fields.bookingId ?? null,
    session_id: fields.sessionId ?? null,
    athlete_id: fields.athleteId ?? null,
    guardian_id: fields.guardianId ?? null,
    checkout_session_id: fields.checkoutSessionId ?? null,
  };
}
