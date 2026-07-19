/**
 * DAWG Stripe webhook event handlers (booking-centric).
 */
import type Stripe from "stripe";
import {
  claimStripeEvent,
  expirePendingBooking,
  markPaymentFailed,
  markStripeEventProcessed,
} from "./adapter";
import { applyPaidCheckoutSession } from "./reconcile-checkout";
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

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const applied = await applyPaidCheckoutSession(session);
  return applied.bookingId;
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
  const fullyRefunded =
    charge.refunded || refundedAmount >= booking.amount_paid_cents;

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

/** Re-fetch a Checkout session from Stripe (used by some admin tooling). */
export async function retrieveCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  if (!stripe) return null;
  return stripe.checkout.sessions.retrieve(sessionId);
}
