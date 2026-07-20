import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoggedInPackageCheckoutForm } from "@/components/public/logged-in-package-checkout-form";
import { listActivePackages } from "@/lib/packages";
import {
  getAuthenticatedFamily,
  loginPath,
  registerPath,
  sanitizeReturnPath,
} from "@/lib/family-auth";
import { parentHasAnyIntake } from "@/lib/intake";
import { createMetadata } from "@/lib/seo";
import { formatPrice } from "@/lib/format";

export const metadata = createMetadata({
  title: "Training packages",
  description:
    "Buy a single session, 10-pack, or 20-pack for DAWG Youth Training.",
  path: "/packages",
});

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string; pack?: string; return?: string }>;
}) {
  const q = await searchParams;
  const returnTo = sanitizeReturnPath(q.return, "/schedule");
  const packages = await listActivePackages();
  const packagesPath = `/packages${q.return ? `?return=${encodeURIComponent(returnTo)}` : ""}`;

  const family = await getAuthenticatedFamily();
  let canPurchase = false;
  if (family) {
    const hasIntake = await parentHasAnyIntake(family.parentId);
    if (!hasIntake) {
      redirect(registerPath(packagesPath));
    }
    canPurchase = true;
  }

  if (!canPurchase) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <h1 className="font-heading text-4xl tracking-wide">Training packages</h1>
        <p className="mt-3 text-muted-foreground">
          One-time purchase — use credits until they run out, then buy again
          anytime. Sign in to purchase.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <p className="font-heading text-xl tracking-wide">{pkg.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {pkg.session_count} session{pkg.session_count === 1 ? "" : "s"}
              </p>
              <p className="mt-3 font-heading text-2xl tracking-wide">
                {formatPrice(pkg.price_cents)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href={loginPath(`/packages?return=${encodeURIComponent(returnTo)}`)}>
              Sign in to purchase
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">Training packages</h1>
      <p className="mt-3 text-muted-foreground">
        Signed in as {family!.parentFirstName} {family!.parentLastName}. Choose a
        package — one-time payment, no subscription.
      </p>

      {q.cancelled === "1" ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Checkout was cancelled. You can try again below.
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="font-heading text-xl tracking-wide">{pkg.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {pkg.session_count} session{pkg.session_count === 1 ? "" : "s"}
            </p>
            <p className="mt-3 font-heading text-2xl tracking-wide">
              {formatPrice(pkg.price_cents)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 form-panel">
        <LoggedInPackageCheckoutForm
          packages={packages}
          initialSlug={q.pack}
          returnTo={returnTo}
        />
      </div>

      {returnTo !== "/schedule" ? (
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href={returnTo} className="underline underline-offset-2">
            Continue without purchasing
          </Link>
        </p>
      ) : null}
    </div>
  );
}
