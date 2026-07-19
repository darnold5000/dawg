/**
 * Stripe server client for DAWG.
 * Originated from @signalworks/billing (signalworks-platform/billing).
 * Reuses getStripe / isStripeConfigured only — no catalog checkout.
 */
import Stripe from "stripe";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}
