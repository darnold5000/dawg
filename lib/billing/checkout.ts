/**
 * DAWG guest booking Checkout.
 * mode: payment + dynamic price_data from DAWG DB.
 * Hold expiry is DAWG booking_expires_at (15 min) — never Stripe expires_at.
 */
import type Stripe from "stripe";
import {
  attachCheckoutSession,
  expirePendingBooking,
  getBookingForCheckout,
} from "./adapter";
import { getStripe, isStripeConfigured } from "./stripe/server";
import type { AdapterResult } from "./types";

export type CreateBookingCheckoutResult = AdapterResult<{
  url: string;
  sessionId: string;
}>;

export async function createBookingCheckout(params: {
  bookingId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CreateBookingCheckoutResult> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      error: "Stripe is not configured",
      code: "STRIPE_UNAVAILABLE",
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, error: "Stripe unavailable", code: "STRIPE_UNAVAILABLE" };
  }

  const loaded = await getBookingForCheckout(params.bookingId);
  if (!loaded.ok) return loaded;

  const booking = loaded.data;
  const priceCents = booking.session.price_cents;
  if (priceCents <= 0) {
    return {
      ok: false,
      error: "Session price must be greater than zero for online payment",
      code: "INVALID_PRICE",
    };
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: booking.session.currency || "usd",
        unit_amount: priceCents,
        product_data: {
          name: booking.session.title,
          description: `${booking.session.session_date} · ${booking.athlete.first_name} ${booking.athlete.last_name}`,
        },
      },
    },
  ];

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: booking.parent.email,
      line_items: lineItems,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: booking.id,
      metadata: {
        bookingId: booking.id,
        sessionId: booking.session_id,
        athleteId: booking.athlete_id,
        business: "dawg",
        confirmationToken: booking.confirmation_token,
      },
      payment_intent_data: {
        metadata: {
          bookingId: booking.id,
          sessionId: booking.session_id,
          athleteId: booking.athlete_id,
          business: "dawg",
        },
      },
      // Intentionally omit expires_at — DAWG hold is 15 minutes.
    });

    if (!checkout.url) {
      await expirePendingBooking({
        bookingId: booking.id,
        reason: "Checkout URL missing",
      });
      return { ok: false, error: "Checkout URL missing", code: "NO_URL" };
    }

    const attached = await attachCheckoutSession({
      bookingId: booking.id,
      stripeCheckoutSessionId: checkout.id,
      stripeCustomerId:
        typeof checkout.customer === "string" ? checkout.customer : null,
    });

    if (!attached.ok) {
      await expirePendingBooking({
        bookingId: booking.id,
        reason: "Failed to attach Checkout session",
      });
      return {
        ok: false,
        error: attached.error,
        code: attached.code,
      };
    }

    return {
      ok: true,
      data: { url: checkout.url, sessionId: checkout.id },
    };
  } catch (err) {
    await expirePendingBooking({
      bookingId: params.bookingId,
      reason: "Checkout creation failed",
    });
    const message =
      err instanceof Error ? err.message : "Could not create Checkout session";
    return { ok: false, error: message, code: "CHECKOUT_CREATE_FAILED" };
  }
}
