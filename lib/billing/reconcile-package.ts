import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe/server";
import {
  confirmPackagePurchasePaid,
  getPurchaseByCheckoutSession,
  getPurchaseById,
} from "@/lib/packages";
import { sendPackagePurchaseConfirmation } from "@/lib/email";

function purchaseIdFromSession(session: Stripe.Checkout.Session): string | null {
  const fromMeta = session.metadata?.purchaseId ?? session.metadata?.purchase_id;
  if (typeof fromMeta === "string" && fromMeta.length > 0) return fromMeta;
  if (
    typeof session.client_reference_id === "string" &&
    session.client_reference_id.length > 0
  ) {
    return session.client_reference_id;
  }
  return null;
}

export async function applyPaidPackageCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ purchaseId: string; confirmed: boolean }> {
  let purchaseId = purchaseIdFromSession(session);
  if (!purchaseId) {
    const byCheckout = await getPurchaseByCheckoutSession(session.id);
    purchaseId = byCheckout?.id ?? null;
  }
  if (!purchaseId) throw new Error("Missing purchaseId on Checkout session");

  if (session.payment_status !== "paid") {
    return { purchaseId, confirmed: false };
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

  const result = await confirmPackagePurchasePaid({
    purchaseId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeCustomerId: customerId,
    amountPaidCents: session.amount_total ?? 0,
  });

  if (!result.ok) throw new Error(result.error);

  try {
    const purchase = await getPurchaseById(purchaseId);
    if (purchase?.package && purchase.paid_at) {
      // Email best-effort after confirm
      const { createServiceClient } = await import("@/lib/supabase/server");
      const { DAWG_TABLES } = await import("@/lib/supabase/tables");
      const supabase = createServiceClient();
      const { data: parent } = await supabase
        .from(DAWG_TABLES.parents)
        .select("first_name, last_name, email")
        .eq("id", purchase.parent_id)
        .maybeSingle();
      if (parent?.email) {
        await sendPackagePurchaseConfirmation({
          parentEmail: parent.email,
          parentName: `${parent.first_name} ${parent.last_name}`,
          packageName: purchase.package.name,
          sessionsTotal: purchase.sessions_total,
          amountPaidCents: purchase.amount_paid_cents,
        });
      }
    }
  } catch (err) {
    console.error("[reconcile-package] email failed", err);
  }

  return { purchaseId, confirmed: true };
}

export async function reconcilePackageCheckout(input: {
  checkoutSessionId?: string | null;
  purchaseId?: string | null;
}): Promise<
  | { ok: true; confirmed: boolean; purchaseId?: string }
  | { ok: false; error: string }
> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe is not configured" };
  }
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Stripe unavailable" };

  let checkoutSessionId = input.checkoutSessionId?.trim() || null;
  if (!checkoutSessionId && input.purchaseId) {
    const purchase = await getPurchaseById(input.purchaseId);
    checkoutSessionId = purchase?.stripe_checkout_session_id ?? null;
  }
  if (!checkoutSessionId) {
    return { ok: false, error: "No Checkout session to reconcile" };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    if (session.metadata?.kind !== "package" && !session.metadata?.purchaseId) {
      // Maybe purchase was attached only by checkout id
      const byCheckout = await getPurchaseByCheckoutSession(checkoutSessionId);
      if (!byCheckout) {
        return { ok: false, error: "Not a package checkout" };
      }
    }
    const applied = await applyPaidPackageCheckoutSession(session);
    return {
      ok: true,
      confirmed: applied.confirmed,
      purchaseId: applied.purchaseId,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Reconcile failed",
    };
  }
}
