import Link from "next/link";
import { PackagePurchaseForm } from "@/components/public/package-purchase-form";
import { listActivePackages } from "@/lib/packages";
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
  searchParams: Promise<{ cancelled?: string; pack?: string }>;
}) {
  const q = await searchParams;
  const packages = await listActivePackages();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">Training packages</h1>
      <p className="mt-3 text-muted-foreground">
        Purchase sessions online, then book from the schedule and redeem a
        package credit. New athletes should{" "}
        <Link href="/intake" className="underline underline-offset-2">
          complete intake
        </Link>{" "}
        before their first booking.
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

      <div className="mt-10 rounded-xl border border-border bg-card p-5 sm:p-6">
        <PackagePurchaseForm packages={packages} initialSlug={q.pack} />
      </div>
    </div>
  );
}
