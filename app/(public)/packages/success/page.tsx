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

  if (q.session_id && q.session_id !== "{CHECKOUT_SESSION_ID}") {
    await reconcilePackageCheckout({ checkoutSessionId: q.session_id });
  }
  if (q.purchase_id) {
    const afterSession = await getPurchaseById(q.purchase_id);
    if (afterSession?.status !== "paid") {
      await reconcilePackageCheckout({ purchaseId: q.purchase_id });
    }
  }

  const purchase = q.purchase_id
    ? await getPurchaseById(q.purchase_id)
    : null;

  const confirmed = purchase?.status === "paid";
  const pendingStripeConfirm = !confirmed && Boolean(purchase);

  const creditsLine = (() => {
    if (!purchase) return null;
    if (pendingStripeConfirm) {
      return `${purchase.sessions_total} session${purchase.sessions_total === 1 ? "" : "s"} purchased — activating credits after payment confirms.`;
    }
    return `${purchase.sessions_remaining} of ${purchase.sessions_total} sessions remaining`;
  })();

  const amountLine = (() => {
    if (!purchase?.package) return null;
    if (!confirmed) {
      return (
        <span className="text-muted-foreground">
          Payment processing — refresh in a few seconds if this does not update.
        </span>
      );
    }
    return (
      <>
        Paid{" "}
        {formatPrice(
          purchase.amount_paid_cents > 0
            ? purchase.amount_paid_cents
            : purchase.package.price_cents,
        )}
      </>
    );
  })();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <h1 className="font-heading text-4xl tracking-wide">
        {confirmed ? "Package ready" : "Payment received"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {confirmed
          ? "Your session credits are on file. Check your email for a secure link to view your balance — no login required to have purchased."
          : "We're confirming your purchase — this usually takes a few seconds. Refresh if needed."}
      </p>
      {purchase?.package ? (
        <div className="mx-auto mt-8 max-w-md rounded-xl border border-border bg-card p-5 text-left text-sm">
          <p className="font-heading text-xl tracking-wide">
            {purchase.package.name}
          </p>
          <p className="mt-2 text-muted-foreground">{creditsLine}</p>
          {amountLine ? <p className="mt-1">{amountLine}</p> : null}
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
