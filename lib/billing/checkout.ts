/**
 * DAWG guest booking Checkout scaffold.
 * Uses Stripe Checkout mode "payment" with dynamic price_data.
 * Full route wiring is the next implementation phase.
 *
 * Does NOT use @signalworks/billing createProductCheckout.
 */
import type Stripe from "stripe";
import {
  attachCheckoutSession,
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

  // Never trust browser-supplied price — always load from DAWG DB (session above).
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
    const expiresAt = booking.booking_expires_at
      ? Math.floor(new Date(booking.booking_expires_at).getTime() / 1000)
      : undefined;

    // Stripe requires expires_at between 30 minutes and 24 hours from creation.
    // Our hold is 15 minutes — omit Stripe expiry and rely on booking_expires_at.
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
      },
      payment_intent_data: {
        metadata: {
          bookingId: booking.id,
          sessionId: booking.session_id,
          athleteId: booking.athlete_id,
          business: "dawg",
        },
      },
      ...(expiresAt && expiresAt - Math.floor(Date.now() / 1000) >= 30 * 60
        ? { expires_at: expiresAt }
        : {}),
    });

    if (!checkout.url) {
      return { ok: false, error: "Checkout URL missing", code: "NO_URL" };
    }

    const attached = await attachCheckoutSession({
      bookingId: booking.id,
      stripeCheckoutSessionId: checkout.id,
      stripeCustomerId:
        typeof checkout.customer === "string" ? checkout.customer : null,
    });

    if (!attached.ok) {
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
    const message =
      err instanceof Error ? err.message : "Could not create Checkout session";
    return { ok: false, error: message, code: "CHECKOUT_CREATE_FAILED" };
  }
}
