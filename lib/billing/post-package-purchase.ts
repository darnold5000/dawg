import type Stripe from "stripe";
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
  normalizeEmail,
  reassignPackagePurchaseParent,
} from "@/lib/parent-account";

function verifiedCheckoutEmail(
  session: Stripe.Checkout.Session,
): string | null {
  const fromDetails = session.customer_details?.email?.trim();
  const fromSession = session.customer_email?.trim();
  const email = fromDetails || fromSession || null;
  return email ? normalizeEmail(email) : null;
}

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
 * email and send the correct post-purchase email (claim vs. view credits).
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

  const existingParent = await getParentById(purchaseBefore.parent_id);
  const parent = await findOrCreateParentByEmail({
    email: verifiedEmail,
    firstName: contact.firstName || existingParent?.first_name || "DAWG",
    lastName: contact.lastName || existingParent?.last_name || "Family",
    phone: contact.phone || existingParent?.phone || "",
  });

  if (!parent) {
    console.error("[post-package-purchase] could not resolve parent");
    return;
  }

  if (parent.id !== purchaseBefore.parent_id) {
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
