import Link from "next/link";
import { Button } from "@/components/ui/button";
import { reconcilePackageCheckout } from "@/lib/billing/reconcile-package";
import { getPurchaseById } from "@/lib/packages";
import { createMetadata } from "@/lib/seo";
import { formatPrice } from "@/lib/format";

export const metadata = createMetadata({
  title: "Package purchased",
  description: "Your DAWG training package confirmation.",
  path: "/packages/success",
});

export default async function PackageSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    purchase_id?: string;
    session_id?: string;
    payment?: string;
  }>;
}) {
  const q = await searchParams;
  const payAtFacility = q.payment === "pay_at_facility";

  if (!payAtFacility) {
    if (q.session_id && q.session_id !== "{CHECKOUT_SESSION_ID}") {
      await reconcilePackageCheckout({ checkoutSessionId: q.session_id });
    } else if (q.purchase_id) {
      await reconcilePackageCheckout({ purchaseId: q.purchase_id });
    }
  }

  const purchase = q.purchase_id
    ? await getPurchaseById(q.purchase_id)
    : null;

  const confirmed = purchase?.status === "paid";
  const pendingFacility = payAtFacility && purchase?.status === "pending";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <h1 className="font-heading text-4xl tracking-wide">
        {pendingFacility
          ? "Order saved"
          : confirmed
            ? "Package ready"
            : "Payment received"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {pendingFacility
          ? "Your package order is on file. Pay at the facility when you arrive — session credits activate after staff confirms payment."
          : confirmed
            ? "Your session credits are on file. Check your email for a secure link to view your balance — no login required to have purchased."
            : "We're confirming your purchase — this usually takes a few seconds. Refresh if needed."}
      </p>
      {purchase?.package ? (
        <div className="mx-auto mt-8 max-w-md rounded-xl border border-border bg-card p-5 text-left text-sm">
          <p className="font-heading text-xl tracking-wide">
            {purchase.package.name}
          </p>
          <p className="mt-2 text-muted-foreground">
            {pendingFacility
              ? "Credits activate after you pay at the facility."
              : `${purchase.sessions_remaining} of ${purchase.sessions_total} sessions remaining`}
          </p>
          {pendingFacility || payAtFacility ? (
            <p className="mt-1 text-muted-foreground">
              Amount due at facility:{" "}
              {formatPrice(purchase.package.price_cents)}
            </p>
          ) : (
            <p className="mt-1">
              Paid{" "}
              {formatPrice(
                purchase.amount_paid_cents || purchase.package.price_cents,
              )}
            </p>
          )}
        </div>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Link href="/schedule">Book a session</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/packages">View packages</Link>
        </Button>
      </div>
    </div>
  );
}
