import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe/server";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import {
  getPackageBySlug,
  type PackageCheckoutInput,
} from "@/lib/packages";
import type { AdapterResult } from "@/lib/billing/types";
import { getSiteUrl } from "@/lib/billing/site-url";

export type PackageCheckoutParams = PackageCheckoutInput & {
  parentId?: string;
  athleteId?: string | null;
};

export async function createPackageCheckout(
  input: PackageCheckoutParams,
): Promise<
  AdapterResult<{ url: string; purchaseId: string; sessionId: string }>
> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      error: "Stripe is not configured",
      code: "STRIPE_UNAVAILABLE",
    };
  }
  const stripe = getStripe();
  if (!stripe || !isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Checkout unavailable", code: "UNAVAILABLE" };
  }

  const pkg = await getPackageBySlug(input.packageSlug);
  if (!pkg || !pkg.active) {
    return { ok: false, error: "Package not found", code: "PACKAGE_NOT_FOUND" };
  }

  const supabase = createServiceClient();

  let parentId = input.parentId;
  if (!parentId) {
    const { data: existingParent } = await supabase
      .from(DAWG_TABLES.parents)
      .select("id")
      .ilike("email", input.parentEmail)
      .maybeSingle();

    if (existingParent) {
      parentId = existingParent.id;
      await supabase
        .from(DAWG_TABLES.parents)
        .update({
          first_name: input.parentFirstName,
          last_name: input.parentLastName,
          phone: input.parentPhone,
        })
        .eq("id", parentId);
    } else {
      const { data: parent, error } = await supabase
        .from(DAWG_TABLES.parents)
        .insert({
          first_name: input.parentFirstName,
          last_name: input.parentLastName,
          email: input.parentEmail,
          phone: input.parentPhone,
        })
        .select("id")
        .single();
      if (error || !parent) {
        return { ok: false, error: "Could not save parent", code: "PARENT_FAILED" };
      }
      parentId = parent.id;
    }
  }

  if (!parentId) {
    return { ok: false, error: "Could not resolve parent", code: "PARENT_FAILED" };
  }

  let athleteId: string | null = input.athleteId ?? null;
  if (!athleteId) {
    const { data: siblings } = await supabase
      .from(DAWG_TABLES.athletes)
      .select("id, first_name, last_name, date_of_birth")
      .eq("parent_id", parentId);
    const match = (siblings ?? []).find(
      (a) =>
        a.first_name.trim().toLowerCase() ===
          input.athleteFirstName.trim().toLowerCase() &&
        a.last_name.trim().toLowerCase() ===
          input.athleteLastName.trim().toLowerCase() &&
        a.date_of_birth === input.athleteDob,
    );
    if (match) {
      athleteId = match.id;
    } else {
      const { data: created } = await supabase
        .from(DAWG_TABLES.athletes)
        .insert({
          parent_id: parentId,
          first_name: input.athleteFirstName.trim(),
          last_name: input.athleteLastName.trim(),
          date_of_birth: input.athleteDob,
        })
        .select("id")
        .single();
      athleteId = created?.id ?? null;
    }
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .insert({
      parent_id: parentId,
      package_id: pkg.id,
      athlete_id: athleteId,
      status: "pending",
      sessions_total: pkg.session_count,
      sessions_remaining: 0,
      amount_paid_cents: 0,
      currency: pkg.currency,
    })
    .select("*")
    .single();

  if (purchaseError || !purchase) {
    return {
      ok: false,
      error: purchaseError?.message ?? "Could not create purchase",
      code: "PURCHASE_FAILED",
    };
  }

  const site = getSiteUrl();
  const successUrl = `${site}/packages/success?purchase_id=${encodeURIComponent(purchase.id)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${site}/packages?cancelled=1`;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: pkg.currency || "usd",
        unit_amount: pkg.price_cents,
        product_data: {
          name: `DAWG ${pkg.name}`,
          description:
            pkg.description ??
            `${pkg.session_count} training session${pkg.session_count === 1 ? "" : "s"}`,
        },
      },
    },
  ];

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.parentEmail,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: purchase.id,
      metadata: {
        business: "dawg",
        kind: "package",
        purchaseId: purchase.id,
        packageId: pkg.id,
        packageSlug: pkg.slug,
        parentId,
      },
      payment_intent_data: {
        metadata: {
          business: "dawg",
          kind: "package",
          purchaseId: purchase.id,
        },
      },
    });

    if (!checkout.url) {
      await supabase
        .from(DAWG_TABLES.packagePurchases)
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", purchase.id);
      return { ok: false, error: "Checkout URL missing", code: "NO_URL" };
    }

    await supabase
      .from(DAWG_TABLES.packagePurchases)
      .update({
        stripe_checkout_session_id: checkout.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchase.id);

    return {
      ok: true,
      data: {
        url: checkout.url,
        purchaseId: purchase.id,
        sessionId: checkout.id,
      },
    };
  } catch (err) {
    await supabase
      .from(DAWG_TABLES.packagePurchases)
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", purchase.id);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Checkout failed",
      code: "CHECKOUT_FAILED",
    };
  }
}
