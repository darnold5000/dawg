/**
 * POST /api/stripe/webhook
 * Verifies signature, records dawg_stripe_events, processes booking updates.
 */
import { NextResponse } from "next/server";
import { isStripeConfigured, verifyStripeWebhook } from "@/lib/billing";
import { processStripeWebhookEvent } from "@/lib/billing/webhook-handlers";

export const runtime = "nodejs";

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

  try {
    const result = await processStripeWebhookEvent(verified.event);
    return NextResponse.json({
      received: true,
      synced: result.processed,
      bookingId: result.bookingId ?? null,
      eventType: verified.event.type,
    });
  } catch (err) {
    console.error("Stripe webhook processing error", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Webhook processing failed",
      },
      { status: 500 },
    );
  }
}
