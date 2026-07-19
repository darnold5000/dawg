/**
 * Stripe webhook signature verification for DAWG.
 * Pattern originated from @signalworks/billing verifyAndHandleStripeWebhook.
 * Event handling is DAWG-specific (booking adapter) — wired in a later phase.
 */
import type Stripe from "stripe";
import { getStripe } from "./server";

export type VerifiedStripeEvent =
  | { ok: true; event: Stripe.Event }
  | { ok: false; status: number; error: string };

export function verifyStripeWebhook(params: {
  body: string;
  signature: string | null;
  webhookSecret: string | undefined;
}): VerifiedStripeEvent {
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, status: 503, error: "Stripe unavailable" };
  }

  if (!params.signature || !params.webhookSecret) {
    return {
      ok: false,
      status: 400,
      error: "Missing webhook signature configuration",
    };
  }

  try {
    const event = stripe.webhooks.constructEvent(
      params.body,
      params.signature,
      params.webhookSecret,
    );
    return { ok: true, event };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return { ok: false, status: 400, error: message };
  }
}
