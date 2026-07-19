/**
 * DAWG booking payment adapter.
 * Guest session bookings — not catalog/membership billing.
 */
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import type { Booking, PaymentTransaction } from "@/lib/types/database";
// Launch: cancellations disabled — re-enable with cancellation emails later.
// import { sendBookingCancellationEmail } from "@/lib/email";
import { getStripe, isStripeConfigured } from "./stripe/server";
import type {
  AdapterResult,
  AttachCheckoutSessionInput,
  BookingPaymentRecord,
  ConfirmPaidBookingInput,
  ExpirePendingBookingInput,
  MarkFacilityBookingPaidInput,
  MarkPaymentFailedInput,
  RefundBookingInput,
} from "./types";

const BOOKING_SELECT = `
  *,
  session:dawg_sessions (
    id, title, session_date, start_time, end_time,
    price_cents, currency, payment_requirement, status,
    location_name, location_address, cancellation_policy
  ),
  parent:dawg_parents ( id, first_name, last_name, email, phone ),
  athlete:dawg_athletes ( id, first_name, last_name )
`;

function requireService() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role is required for billing adapter");
  }
  return createServiceClient();
}

// Launch: cancellations disabled.
// async function notifyParentOfCancellationOrRefund(input: {
//   bookingId: string;
//   refundInitiated: boolean;
// }) {
//   try {
//     const supabase = requireService();
//     const { data } = await supabase
//       .from(DAWG_TABLES.bookings)
//       .select(BOOKING_SELECT)
//       .eq("id", input.bookingId)
//       .maybeSingle();
//
//     if (!data) return;
//     const row = data as Booking & {
//       session?: {
//         title: string;
//         session_date: string;
//         start_time: string;
//       } | null;
//       parent?: {
//         first_name: string;
//         last_name: string;
//         email: string;
//       } | null;
//       athlete?: { first_name: string; last_name: string } | null;
//     };
//
//     if (!row.parent?.email || !row.session || !row.athlete) return;
//
//     await sendBookingCancellationEmail({
//       parentEmail: row.parent.email,
//       parentName: `${row.parent.first_name} ${row.parent.last_name}`,
//       athleteName: `${row.athlete.first_name} ${row.athlete.last_name}`,
//       sessionTitle: row.session.title,
//       sessionDate: row.session.session_date,
//       startTime: row.session.start_time,
//       confirmationNumber: row.confirmation_number,
//       refundInitiated: input.refundInitiated,
//     });
//   } catch (err) {
//     console.error("[adapter] cancellation email", err);
//   }
// }

function mapBookingRecord(row: Record<string, unknown>): BookingPaymentRecord {
  const session = row.session as BookingPaymentRecord["session"];
  const parent = row.parent as BookingPaymentRecord["parent"];
  const athlete = row.athlete as BookingPaymentRecord["athlete"];
  const { session: _s, parent: _p, athlete: _a, ...booking } = row;
  return {
    ...(booking as unknown as Booking),
    session,
    parent,
    athlete,
  };
}

export async function getBookingForCheckout(
  bookingId: string,
): Promise<AdapterResult<BookingPaymentRecord>> {
  try {
    const supabase = requireService();
    const { data, error } = await supabase
      .from(DAWG_TABLES.bookings)
      .select(BOOKING_SELECT)
      .eq("id", bookingId)
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: "Booking not found", code: "NOT_FOUND" };
    }

    const record = mapBookingRecord(data as Record<string, unknown>);

    if (record.status !== "pending") {
      return {
        ok: false,
        error: "Booking is not awaiting payment",
        code: "NOT_PENDING",
      };
    }

    if (
      record.booking_expires_at &&
      new Date(record.booking_expires_at).getTime() <= Date.now()
    ) {
      return {
        ok: false,
        error: "Booking hold has expired",
        code: "EXPIRED",
      };
    }

    if (record.payment_method !== "stripe") {
      return {
        ok: false,
        error: "Booking is not an online payment",
        code: "WRONG_METHOD",
      };
    }

    return { ok: true, data: record };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Adapter error",
    };
  }
}

export async function attachCheckoutSession(
  input: AttachCheckoutSessionInput,
): Promise<AdapterResult<Booking>> {
  try {
    const supabase = requireService();
    const { data, error } = await supabase
      .from(DAWG_TABLES.bookings)
      .update({
        stripe_checkout_session_id: input.stripeCheckoutSessionId,
        stripe_customer_id: input.stripeCustomerId ?? undefined,
        payment_status: "pending",
      })
      .eq("id", input.bookingId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Could not attach Checkout session",
        code: "ATTACH_FAILED",
      };
    }

    return { ok: true, data: data as Booking };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Adapter error",
    };
  }
}

export async function confirmPaidBooking(
  input: ConfirmPaidBookingInput,
): Promise<AdapterResult<{ booking: Booking; emailAlreadySent: boolean }>> {
  try {
    const supabase = requireService();

    const { data: existing, error: loadError } = await supabase
      .from(DAWG_TABLES.bookings)
      .select("*")
      .eq("id", input.bookingId)
      .maybeSingle();

    if (loadError || !existing) {
      return { ok: false, error: "Booking not found", code: "NOT_FOUND" };
    }

    const current = existing as Booking;

    if (current.payment_status === "paid" && current.status === "confirmed") {
      return {
        ok: true,
        data: {
          booking: current,
          emailAlreadySent: Boolean(current.confirmation_email_sent_at),
        },
      };
    }

    if (current.amount_due_cents > 0 && input.amountPaidCents < current.amount_due_cents) {
      return {
        ok: false,
        error: "Paid amount does not match amount due",
        code: "AMOUNT_MISMATCH",
      };
    }

    const paidAt = new Date().toISOString();
    const { data, error } = await supabase
      .from(DAWG_TABLES.bookings)
      .update({
        status: "confirmed",
        payment_status: "paid",
        payment_method: "stripe",
        amount_paid_cents: input.amountPaidCents,
        currency: input.currency ?? current.currency,
        stripe_checkout_session_id:
          input.stripeCheckoutSessionId ?? current.stripe_checkout_session_id,
        stripe_payment_intent_id:
          input.stripePaymentIntentId ?? current.stripe_payment_intent_id,
        stripe_charge_id: input.stripeChargeId ?? current.stripe_charge_id,
        stripe_customer_id:
          input.stripeCustomerId ?? current.stripe_customer_id,
        paid_at: paidAt,
        booking_expires_at: null,
        payment_failure_message: null,
      })
      .eq("id", input.bookingId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Could not confirm booking",
        code: "CONFIRM_FAILED",
      };
    }

    await supabase.from(DAWG_TABLES.paymentTransactions).insert({
      booking_id: input.bookingId,
      transaction_type: "payment",
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
      stripe_charge_id: input.stripeChargeId ?? null,
      amount_cents: input.amountPaidCents,
      currency: input.currency ?? current.currency,
      status: "succeeded",
      metadata: {
        stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      },
    });

    return {
      ok: true,
      data: {
        booking: data as Booking,
        emailAlreadySent: Boolean(current.confirmation_email_sent_at),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Adapter error",
    };
  }
}

export async function expirePendingBooking(
  input: ExpirePendingBookingInput,
): Promise<AdapterResult<Booking>> {
  try {
    const supabase = requireService();
    const { data, error } = await supabase
      .from(DAWG_TABLES.bookings)
      .update({
        status: "expired",
        payment_status: "failed",
        payment_failure_message: input.reason ?? "Checkout expired",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", input.bookingId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message, code: "EXPIRE_FAILED" };
    }

    if (!data) {
      const { data: existing } = await supabase
        .from(DAWG_TABLES.bookings)
        .select("*")
        .eq("id", input.bookingId)
        .maybeSingle();
      if (existing) {
        return { ok: true, data: existing as Booking };
      }
      return { ok: false, error: "Booking not found", code: "NOT_FOUND" };
    }

    return { ok: true, data: data as Booking };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Adapter error",
    };
  }
}

export async function markPaymentFailed(
  input: MarkPaymentFailedInput,
): Promise<AdapterResult<Booking>> {
  try {
    const supabase = requireService();
    const patch: Record<string, unknown> = {
      payment_status: "failed",
      payment_failure_message: input.message ?? "Payment failed",
    };

    if (input.releaseHold !== false) {
      patch.status = "cancelled";
      patch.cancelled_at = new Date().toISOString();
      patch.booking_expires_at = null;
    }

    const { data, error } = await supabase
      .from(DAWG_TABLES.bookings)
      .update(patch)
      .eq("id", input.bookingId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Could not mark payment failed",
        code: "FAIL_UPDATE_FAILED",
      };
    }

    return { ok: true, data: data as Booking };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Adapter error",
    };
  }
}

export async function markFacilityBookingUnpaid(input: {
  bookingId: string;
  note?: string;
  markedByProfileId?: string | null;
}): Promise<AdapterResult<Booking>> {
  try {
    const supabase = requireService();
    const { data: existing, error: loadError } = await supabase
      .from(DAWG_TABLES.bookings)
      .select("*")
      .eq("id", input.bookingId)
      .maybeSingle();

    if (loadError || !existing) {
      return { ok: false, error: "Booking not found", code: "NOT_FOUND" };
    }

    const current = existing as Booking;
    if (current.payment_method !== "pay_at_facility") {
      return {
        ok: false,
        error: "Only pay-at-facility bookings can be marked unpaid manually",
        code: "WRONG_METHOD",
      };
    }

    const note = input.note
      ? `${current.internal_notes ? `${current.internal_notes}\n` : ""}[unpaid] ${input.note}`
      : current.internal_notes;

    const { data, error } = await supabase
      .from(DAWG_TABLES.bookings)
      .update({
        payment_status: "unpaid",
        amount_paid_cents: 0,
        paid_at: null,
        internal_notes: note,
      })
      .eq("id", input.bookingId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Could not mark unpaid",
        code: "MARK_UNPAID_FAILED",
      };
    }

    await supabase.from(DAWG_TABLES.paymentTransactions).insert({
      booking_id: input.bookingId,
      transaction_type: "adjustment",
      amount_cents: 0,
      currency: current.currency,
      status: "succeeded",
      metadata: {
        method: "pay_at_facility",
        action: "mark_unpaid",
        marked_by: input.markedByProfileId ?? null,
        note: input.note ?? null,
      },
    });

    return { ok: true, data: data as Booking };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Adapter error",
    };
  }
}

export async function markFacilityBookingPaid(
  input: MarkFacilityBookingPaidInput,
): Promise<AdapterResult<Booking>> {
  try {
    const supabase = requireService();
    const { data: existing, error: loadError } = await supabase
      .from(DAWG_TABLES.bookings)
      .select("*")
      .eq("id", input.bookingId)
      .maybeSingle();

    if (loadError || !existing) {
      return { ok: false, error: "Booking not found", code: "NOT_FOUND" };
    }

    const current = existing as Booking;
    if (current.payment_method !== "pay_at_facility") {
      return {
        ok: false,
        error: "Only pay-at-facility bookings can be marked paid manually",
        code: "WRONG_METHOD",
      };
    }

    const amount =
      input.amountPaidCents ??
      current.amount_due_cents ??
      0;
    const note = input.note
      ? `${current.internal_notes ? `${current.internal_notes}\n` : ""}[paid] ${input.note}`
      : current.internal_notes;

    const { data, error } = await supabase
      .from(DAWG_TABLES.bookings)
      .update({
        payment_status: "paid",
        amount_paid_cents: amount,
        paid_at: new Date().toISOString(),
        internal_notes: note,
      })
      .eq("id", input.bookingId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Could not mark paid",
        code: "MARK_PAID_FAILED",
      };
    }

    await supabase.from(DAWG_TABLES.paymentTransactions).insert({
      booking_id: input.bookingId,
      transaction_type: "payment",
      amount_cents: amount,
      currency: current.currency,
      status: "succeeded",
      metadata: {
        method: "pay_at_facility",
        marked_by: input.markedByProfileId ?? null,
        note: input.note ?? null,
      },
    });

    return { ok: true, data: data as Booking };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Adapter error",
    };
  }
}

export async function refundBooking(
  input: RefundBookingInput,
): Promise<AdapterResult<{ booking: Booking; stripeRefundId?: string }>> {
  try {
    const supabase = requireService();
    const { data: existing, error: loadError } = await supabase
      .from(DAWG_TABLES.bookings)
      .select("*")
      .eq("id", input.bookingId)
      .maybeSingle();

    if (loadError || !existing) {
      return { ok: false, error: "Booking not found", code: "NOT_FOUND" };
    }

    const current = existing as Booking;

    if (current.payment_status !== "paid" && current.payment_status !== "partially_refunded") {
      return {
        ok: false,
        error: "Booking is not refundable",
        code: "NOT_REFUNDABLE",
      };
    }

    const refundable =
      current.amount_paid_cents - current.amount_refunded_cents;
    if (refundable <= 0) {
      return {
        ok: false,
        error: "Nothing left to refund",
        code: "ALREADY_REFUNDED",
      };
    }

    let stripeRefundId: string | undefined;

    if (current.payment_method === "stripe") {
      if (!isStripeConfigured()) {
        return {
          ok: false,
          error: "Stripe is not configured",
          code: "STRIPE_UNAVAILABLE",
        };
      }
      const stripe = getStripe();
      if (!stripe || !current.stripe_payment_intent_id) {
        return {
          ok: false,
          error: "Missing Stripe payment intent for refund",
          code: "MISSING_PI",
        };
      }

      const refund = await stripe.refunds.create({
        payment_intent: current.stripe_payment_intent_id,
        amount: refundable,
        reason: "requested_by_customer",
        metadata: {
          bookingId: current.id,
          business: "dawg",
          refundedBy: input.refundedByProfileId ?? "",
          note: input.reason ?? "",
        },
      });
      stripeRefundId = refund.id;
    }

    const patch: Record<string, unknown> = {
      payment_status: "refunded",
      amount_refunded_cents: current.amount_paid_cents,
      refunded_at: new Date().toISOString(),
      internal_notes: input.reason
        ? `${current.internal_notes ? `${current.internal_notes}\n` : ""}[refund] ${input.reason}`
        : current.internal_notes,
    };

    // Launch: cancellations disabled — refunds do not cancel the booking.
    // if (input.cancelBooking) {
    //   patch.status = "cancelled";
    //   patch.attendance_status = "cancelled";
    //   patch.cancelled_at = new Date().toISOString();
    // }

    const { data, error } = await supabase
      .from(DAWG_TABLES.bookings)
      .update(patch)
      .eq("id", input.bookingId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Could not update booking after refund",
        code: "REFUND_UPDATE_FAILED",
      };
    }

    await supabase.from(DAWG_TABLES.paymentTransactions).insert({
      booking_id: input.bookingId,
      transaction_type: "refund",
      stripe_payment_intent_id: current.stripe_payment_intent_id,
      stripe_charge_id: current.stripe_charge_id,
      stripe_refund_id: stripeRefundId ?? null,
      amount_cents: refundable,
      currency: current.currency,
      status: "succeeded",
      metadata: {
        reason: input.reason ?? null,
        refunded_by: input.refundedByProfileId ?? null,
        method: current.payment_method,
      },
    });

    // Launch: cancellations disabled.
    // void notifyParentOfCancellationOrRefund({
    //   bookingId: input.bookingId,
    //   refundInitiated: true,
    // });

    return {
      ok: true,
      data: { booking: data as Booking, stripeRefundId },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Adapter error",
    };
  }
}

export async function markConfirmationEmailSent(
  bookingId: string,
): Promise<AdapterResult> {
  try {
    const supabase = requireService();
    const { error } = await supabase
      .from(DAWG_TABLES.bookings)
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", bookingId)
      .is("confirmation_email_sent_at", null);

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Adapter error",
    };
  }
}

export async function listPaymentTransactions(
  bookingId: string,
): Promise<AdapterResult<PaymentTransaction[]>> {
  try {
    const supabase = requireService();
    const { data, error } = await supabase
      .from(DAWG_TABLES.paymentTransactions)
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, data: (data ?? []) as PaymentTransaction[] };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Adapter error",
    };
  }
}

/**
 * Idempotent Stripe event claim.
 * Returns whether this worker should process the event.
 */
export async function claimStripeEvent(input: {
  stripeEventId: string;
  eventType: string;
  bookingId?: string | null;
  payload?: unknown;
}): Promise<AdapterResult<{ shouldProcess: boolean }>> {
  try {
    const supabase = requireService();
    const { data: existing } = await supabase
      .from(DAWG_TABLES.stripeEvents)
      .select("id, processed")
      .eq("stripe_event_id", input.stripeEventId)
      .maybeSingle();

    if (existing?.processed) {
      return { ok: true, data: { shouldProcess: false } };
    }

    if (existing) {
      return { ok: true, data: { shouldProcess: true } };
    }

    const { error } = await supabase.from(DAWG_TABLES.stripeEvents).insert({
      stripe_event_id: input.stripeEventId,
      event_type: input.eventType,
      booking_id: input.bookingId ?? null,
      processed: false,
      payload: input.payload ?? null,
    });

    if (error) {
      // Unique race — another worker inserted first
      if (error.code === "23505") {
        return { ok: true, data: { shouldProcess: false } };
      }
      return { ok: false, error: error.message };
    }

    return { ok: true, data: { shouldProcess: true } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Adapter error",
    };
  }
}

export async function markStripeEventProcessed(input: {
  stripeEventId: string;
  bookingId?: string | null;
  error?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const supabase = createServiceClient();
  await supabase
    .from(DAWG_TABLES.stripeEvents)
    .update({
      processed: !input.error,
      processing_error: input.error ?? null,
      booking_id: input.bookingId ?? undefined,
      processed_at: new Date().toISOString(),
    })
    .eq("stripe_event_id", input.stripeEventId);
}
