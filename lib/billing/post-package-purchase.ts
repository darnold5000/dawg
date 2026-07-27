import type Stripe from "stripe";
import { verifiedCheckoutEmail } from "@/lib/billing/verified-checkout-email";
import { createFamilyAccessToken } from "@/lib/family-login";
import {
  sendAccountClaimEmail,
  sendPackagePurchaseConfirmation,
} from "@/lib/email";
import { getPurchaseById } from "@/lib/packages";
import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import {
  findOrCreateParentByEmail,
  getParentAccountStatus,
  getParentById,
  markParentInviteSent,
  reassignPackagePurchaseParent,
} from "@/lib/parent-account";

function contactFromMetadata(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  return {
    firstName: (meta.parentFirstName ?? "").trim(),
    lastName: (meta.parentLastName ?? "").trim(),
    phone: (meta.parentPhone ?? "").trim(),
  };
}

/**
 * Guest checkout leaves guardian_id null until Stripe verifies email.
 * DB requires guardian_id before status = paid — call this before confirmPackagePurchasePaid.
 */
export async function ensurePackagePurchaseParentFromStripe(
  purchaseId: string,
  stripeSession: Stripe.Checkout.Session,
): Promise<{ ok: true; parentId: string } | { ok: false; error: string }> {
  const verifiedEmail = verifiedCheckoutEmail(stripeSession);
  if (!verifiedEmail) {
    return { ok: false, error: "Missing verified email on Checkout session" };
  }

  const purchaseBefore = await getPurchaseById(purchaseId);
  if (!purchaseBefore) {
    return { ok: false, error: "Purchase not found" };
  }

  const contact = contactFromMetadata(stripeSession);
  const provisionalParent = purchaseBefore.parent_id
    ? await getParentById(purchaseBefore.parent_id)
    : null;

  const parent = await findOrCreateParentByEmail({
    email: verifiedEmail,
    firstName: contact.firstName || provisionalParent?.first_name || "DAWG",
    lastName: contact.lastName || provisionalParent?.last_name || "Family",
    phone: contact.phone || provisionalParent?.phone || "",
    requirePhone: false,
  });

  if (!parent) {
    return { ok: false, error: "Could not resolve parent for purchase" };
  }

  if (parent.id !== purchaseBefore.parent_id) {
    await reassignPackagePurchaseParent(purchaseId, parent.id);
  }

  return { ok: true, parentId: parent.id };
}

/**
 * After Stripe confirms payment, attach the purchase to the verified checkout
 * email only (never the pre-checkout form email) and send claim / login email.
 */
export async function handlePostPackagePurchase(input: {
  purchaseId: string;
  stripeSession: Stripe.Checkout.Session;
}): Promise<void> {
  const ensured = await ensurePackagePurchaseParentFromStripe(
    input.purchaseId,
    input.stripeSession,
  );
  if (!ensured.ok) {
    console.error("[post-package-purchase]", ensured.error, input.purchaseId);
    return;
  }

  const purchaseBefore = await getPurchaseById(input.purchaseId);
  if (!purchaseBefore) {
    console.error("[post-package-purchase] purchase not found", input.purchaseId);
    return;
  }

  if (purchaseBefore.post_purchase_email_sent_at) {
    return;
  }

  const parent = await getParentById(ensured.parentId);
  if (!parent) {
    console.error("[post-package-purchase] parent not found", ensured.parentId);
    return;
  }

  const purchase = await getPurchaseById(input.purchaseId);
  if (!purchase?.package || purchase.status !== "paid") {
    return;
  }

  const parentName = `${parent.first_name} ${parent.last_name}`.trim();
  const accountStatus = await getParentAccountStatus(parent.id);

  if (accountStatus === "claimed") {
    const token = await createFamilyAccessToken({
      parentId: parent.id,
      email: parent.email,
      purpose: "login",
    });
    if (!token) {
      console.error("[post-package-purchase] login token failed");
      return;
    }

    await sendPackagePurchaseConfirmation({
      parentEmail: parent.email,
      parentName,
      packageName: purchase.package.name,
      sessionsTotal: purchase.sessions_total,
      amountPaidCents: purchase.amount_paid_cents,
      viewCreditsToken: token,
    });
  } else {
    const claimToken = await createFamilyAccessToken({
      parentId: parent.id,
      email: parent.email,
      purpose: "claim",
    });

    if (!claimToken) {
      console.error("[post-package-purchase] claim token failed");
      return;
    }

    await sendAccountClaimEmail({
      parentEmail: parent.email,
      parentFirstName: parent.first_name,
      packageName: purchase.package.name,
      sessionsTotal: purchase.sessions_total,
      token: claimToken,
      reminder: accountStatus === "invited",
    });

    await markParentInviteSent(parent.id);
  }

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createTrainingServiceClient();
    await supabase
      .from(DAWG_TABLES.packagePurchases)
      .update({
        post_purchase_email_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.purchaseId)
      .is("post_purchase_email_sent_at", null);
  }
}
