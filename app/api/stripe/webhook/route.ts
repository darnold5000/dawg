/**
 * POST /api/stripe/webhook
 * Route structure adapted from @signalworks/billing.
 * Event handlers (confirm/expire/refund sync) land in the next phase.
 */
import { NextResponse } from "next/server";
import { isStripeConfigured, verifyStripeWebhook } from "@/lib/billing";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await request.text();
  const verified = verifyStripeWebhook({
    body,
    signature: request.headers.get("stripe-signature"),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });

  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error },
      { status: verified.status },
    );
  }

  // Phase 5+: claimStripeEvent + handle by type via booking adapter.
  return NextResponse.json({
    received: true,
    synced: false,
    eventType: verified.event.type,
    note: "Webhook verification OK — booking handlers not wired yet",
  });
}
