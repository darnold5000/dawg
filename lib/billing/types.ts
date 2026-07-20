import type {
  AttendanceStatus,
  Booking,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction,
  TrainingSession,
} from "@/lib/types/database";

export type BookingPaymentRecord = Booking & {
  session: Pick<
    TrainingSession,
    | "id"
    | "title"
    | "session_date"
    | "start_time"
    | "end_time"
    | "price_cents"
    | "currency"
    | "payment_requirement"
    | "status"
    | "location_name"
    | "location_address"
    | "cancellation_policy"
  >;
  parent: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
  };
};

export type AttachCheckoutSessionInput = {
  bookingId: string;
  stripeCheckoutSessionId: string;
  stripeCustomerId?: string | null;
};

export type ConfirmPaidBookingInput = {
  bookingId: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeCustomerId?: string | null;
  amountPaidCents: number;
  currency?: string;
};

export type ExpirePendingBookingInput = {
  bookingId: string;
  reason?: string;
};

export type MarkPaymentFailedInput = {
  bookingId: string;
  message?: string;
  releaseHold?: boolean;
};

export type MarkFacilityBookingPaidInput = {
  bookingId: string;
  amountPaidCents?: number;
  note?: string;
  markedByProfileId?: string | null;
};

export type RefundBookingInput = {
  bookingId: string;
  reason?: string;
  /** Full refund only for Launch. */
  cancelBooking?: boolean;
  refundedByProfileId?: string | null;
};

export type AdapterResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export type PaymentStatusBadgeTone =
  | "neutral"
  | "warning"
  | "success"
  | "danger"
  | "info";

export function paymentStatusTone(
  status: PaymentStatus,
): PaymentStatusBadgeTone {
  switch (status) {
    case "paid":
      return "success";
    case "pending":
      return "warning";
    case "unpaid":
      return "info";
    case "failed":
      return "danger";
    case "refunded":
    case "partially_refunded":
      return "neutral";
    case "not_required":
      return "neutral";
    default:
      return "neutral";
  }
}

export type { BookingStatus, AttendanceStatus, PaymentMethod, PaymentTransaction };
