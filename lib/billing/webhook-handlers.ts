/**
 * DAWG Stripe webhook event handlers (booking-centric).
 */
import type Stripe from "stripe";
import {
  sendBookingConfirmation,
  sendStaffBookingNotification,
} from "@/lib/email";
import {
  claimStripeEvent,
  confirmPaidBooking,
  expirePendingBooking,
  markConfirmationEmailSent,
  markPaymentFailed,
  markStripeEventProcessed,
} from "./adapter";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import type { Booking } from "@/lib/types/database";
import { getStripe } from "./stripe/server";

function bookingIdFromMetadata(
  meta: Stripe.Metadata | null | undefined,
): string | null {
  const id = meta?.bookingId ?? meta?.booking_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

async function loadBooking(bookingId: string): Promise<Booking | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.bookings)
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  return (data as Booking) ?? null;
}

async function sendConfirmationOnce(bookingId: string): Promise<void> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.bookings)
    .select(
      `
      *,
      session:dawg_sessions ( title, session_date, start_time, location_address ),
      parent:dawg_parents ( first_name, last_name, email, phone ),
      athlete:dawg_athletes ( first_name, last_name )
    `,
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!data) return;
  const booking = data as Booking & {
    session: {
      title: string;
      session_date: string;
      start_time: string;
      location_address: string | null;
    };
    parent: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
    athlete: { first_name: string; last_name: string };
  };

  if (booking.confirmation_email_sent_at) return;

  await sendBookingConfirmation({
    booking,
    parentEmail: booking.parent.email,
    parentName: `${booking.parent.first_name} ${booking.parent.last_name}`,
    athleteName: `${booking.athlete.first_name} ${booking.athlete.last_name}`,
    sessionTitle: booking.session.title,
    sessionDate: booking.session.session_date,
    startTime: booking.session.start_time,
    location: booking.session.location_address,
    amountDueCents: booking.amount_due_cents,
    amountPaidCents: booking.amount_paid_cents,
    paymentMethod: "stripe",
  });

  await sendStaffBookingNotification({
    booking,
    parentEmail: booking.parent.email,
    parentName: `${booking.parent.first_name} ${booking.parent.last_name}`,
    parentPhone: booking.parent.phone,
    athleteName: `${booking.athlete.first_name} ${booking.athlete.last_name}`,
    sessionTitle: booking.session.title,
    sessionDate: booking.session.session_date,
    startTime: booking.session.start_time,
    paymentStatus: booking.payment_status,
    amountDueCents: booking.amount_due_cents,
  });

  await markConfirmationEmailSent(bookingId);
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const bookingId =
    bookingIdFromMetadata(session.metadata) ??
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null);

  if (!bookingId) {
    throw new Error("Missing bookingId on Checkout session");
  }

  const booking = await loadBooking(bookingId);
  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  const amountTotal = session.amount_total ?? 0;
  const currency = (session.currency ?? "usd").toLowerCase();

  if (currency !== (booking.currency || "usd").toLowerCase()) {
    throw new Error(
      `Currency mismatch: stripe=${currency} booking=${booking.currency}`,
    );
  }

  if (booking.amount_due_cents > 0 && amountTotal < booking.amount_due_cents) {
    throw new Error(
      `Amount mismatch: paid=${amountTotal} due=${booking.amount_due_cents}`,
    );
  }

  if (session.payment_status !== "paid") {
    return bookingId;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer && !session.customer.deleted
        ? session.customer.id
        : null;

  const result = await confirmPaidBooking({
    bookingId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeCustomerId: customerId,
    amountPaidCents: amountTotal,
    currency,
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  if (!result.data.emailAlreadySent) {
    await sendConfirmationOnce(bookingId);
  }

  return bookingId;
}

async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const bookingId =
    bookingIdFromMetadata(session.metadata) ??
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null);
  if (!bookingId) return null;

  const booking = await loadBooking(bookingId);
  if (!booking || booking.status !== "pending") return bookingId;

  await expirePendingBooking({
    bookingId,
    reason: "Stripe Checkout session expired",
  });
  return bookingId;
}

async function handlePaymentFailed(
  pi: Stripe.PaymentIntent,
): Promise<string | null> {
  const bookingId = bookingIdFromMetadata(pi.metadata);
  if (!bookingId) return null;

  await markPaymentFailed({
    bookingId,
    message: pi.last_payment_error?.message ?? "Payment failed",
    releaseHold: true,
  });
  return bookingId;
}

async function handleChargeRefunded(
  charge: Stripe.Charge,
): Promise<string | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;

  const supabase = createServiceClient();
  let booking: Booking | null = null;

  if (paymentIntentId) {
    const { data } = await supabase
      .from(DAWG_TABLES.bookings)
      .select("*")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();
    booking = (data as Booking) ?? null;
  }

  if (!booking && charge.metadata?.bookingId) {
    booking = await loadBooking(charge.metadata.bookingId);
  }

  if (!booking) return null;

  const refundedAmount = charge.amount_refunded ?? 0;
  const fullyRefunded = charge.refunded || refundedAmount >= booking.amount_paid_cents;

  await supabase
    .from(DAWG_TABLES.bookings)
    .update({
      payment_status: fullyRefunded ? "refunded" : "partially_refunded",
      amount_refunded_cents: Math.min(refundedAmount, booking.amount_paid_cents),
      refunded_at: new Date().toISOString(),
      stripe_charge_id: charge.id,
    })
    .eq("id", booking.id);

  const refunds = charge.refunds?.data ?? [];
  for (const refund of refunds) {
    await supabase.from(DAWG_TABLES.paymentTransactions).upsert(
      {
        booking_id: booking.id,
        transaction_type: "refund",
        stripe_payment_intent_id: paymentIntentId,
        stripe_charge_id: charge.id,
        stripe_refund_id: refund.id,
        amount_cents: refund.amount ?? 0,
        currency: refund.currency ?? booking.currency,
        status:
          refund.status === "succeeded"
            ? "succeeded"
            : refund.status === "failed"
              ? "failed"
              : "pending",
        metadata: { source: "charge.refunded" },
      },
      { onConflict: "stripe_refund_id" },
    );
  }

  // If upsert onConflict fails (no unique on stripe_refund_id), insert best-effort
  if (refunds.length === 0 && refundedAmount > 0) {
    await supabase.from(DAWG_TABLES.paymentTransactions).insert({
      booking_id: booking.id,
      transaction_type: "refund",
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: charge.id,
      amount_cents: refundedAmount,
      currency: charge.currency ?? booking.currency,
      status: "succeeded",
      metadata: { source: "charge.refunded" },
    });
  }

  return booking.id;
}

export async function processStripeWebhookEvent(
  event: Stripe.Event,
): Promise<{ processed: boolean; bookingId?: string | null }> {
  const preliminaryBookingId = (() => {
    const obj = event.data.object as { metadata?: Stripe.Metadata };
    return bookingIdFromMetadata(obj.metadata);
  })();

  const claim = await claimStripeEvent({
    stripeEventId: event.id,
    eventType: event.type,
    bookingId: preliminaryBookingId,
    payload: event as unknown as Record<string, unknown>,
  });

  if (!claim.ok) {
    throw new Error(claim.error);
  }

  if (!claim.data.shouldProcess) {
    return { processed: false };
  }

  let bookingId: string | null = preliminaryBookingId;
  try {
    switch (event.type) {
      case "checkout.session.completed":
        bookingId = await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "checkout.session.expired":
        bookingId = await handleCheckoutExpired(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "payment_intent.payment_failed":
        bookingId = await handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case "charge.refunded":
        bookingId = await handleChargeRefunded(
          event.data.object as Stripe.Charge,
        );
        break;
      default:
        break;
    }

    await markStripeEventProcessed({
      stripeEventId: event.id,
      bookingId,
    });
    return { processed: true, bookingId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler error";
    await markStripeEventProcessed({
      stripeEventId: event.id,
      bookingId,
      error: message,
    });
    throw err;
  }
}

/** Optional: retrieve Checkout session for success-page verification. */
export async function retrieveCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  if (!stripe) return null;
  return stripe.checkout.sessions.retrieve(sessionId);
}
