import type Stripe from "stripe";
import { verifiedCheckoutEmail } from "@/lib/billing/verified-checkout-email";
import { createFamilyAccessToken } from "@/lib/family-login";
import {
  sendAccountClaimEmail,
  sendPackagePurchaseConfirmation,
} from "@/lib/email";
import { getPurchaseById } from "@/lib/packages";
import {
  createServiceClient,
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
 * After Stripe confirms payment, attach the purchase to the verified checkout
 * email only (never the pre-checkout form email) and send claim / login email.
 */
export async function handlePostPackagePurchase(input: {
  purchaseId: string;
  stripeSession: Stripe.Checkout.Session;
}): Promise<void> {
  const verifiedEmail = verifiedCheckoutEmail(input.stripeSession);
  if (!verifiedEmail) {
    console.error(
      "[post-package-purchase] missing verified email",
      input.purchaseId,
    );
    return;
  }

  const contact = contactFromMetadata(input.stripeSession);
  const purchaseBefore = await getPurchaseById(input.purchaseId);
  if (!purchaseBefore) {
    console.error("[post-package-purchase] purchase not found", input.purchaseId);
    return;
  }

  if (purchaseBefore.post_purchase_email_sent_at) {
    return;
  }

  const provisionalParent = purchaseBefore.parent_id
    ? await getParentById(purchaseBefore.parent_id)
    : null;

  // Ownership is determined solely by Stripe's verified email — not the form.
  const parent = await findOrCreateParentByEmail({
    email: verifiedEmail,
    firstName: contact.firstName || provisionalParent?.first_name || "DAWG",
    lastName: contact.lastName || provisionalParent?.last_name || "Family",
    phone: contact.phone || provisionalParent?.phone || "",
  });

  if (!parent) {
    console.error("[post-package-purchase] could not resolve parent");
    return;
  }

  if (parent.id !== purchaseBefore.parent_id) {
    if (purchaseBefore.parent_id && provisionalParent) {
      console.info(
        "[post-package-purchase] reassigned purchase from form parent to Stripe-verified parent",
        {
          purchaseId: input.purchaseId,
          from: purchaseBefore.parent_id,
          to: parent.id,
          formEmail: provisionalParent.email,
          verifiedEmail,
        },
      );
    }
    await reassignPackagePurchaseParent(input.purchaseId, parent.id);
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
    const supabase = createServiceClient();
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
