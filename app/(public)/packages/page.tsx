import { PackagePurchaseCards } from "@/components/public/package-purchase-cards";
import { listActivePackages } from "@/lib/packages";
import { getAuthenticatedFamily } from "@/lib/family-auth";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Training packages",
  description:
    "Buy a single session, 10-pack, or 20-pack for DAWG Youth Training.",
  path: "/packages",
});

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const q = await searchParams;
  const packages = await listActivePackages();
  const family = await getAuthenticatedFamily();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">Training packages</h1>
      <p className="mt-3 text-muted-foreground">
        One-time purchase — credits are applied by staff when your athlete
        attends. Buy again anytime when you run out.
      </p>

      {q.cancelled === "1" ? (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Checkout was cancelled. You can try again below.
        </p>
      ) : null}

      {family ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Signed in as {family.parentFirstName} {family.parentLastName}.
        </p>
      ) : null}

      <div className="mt-8">
        <PackagePurchaseCards
          packages={packages}
          initialContact={
            family
              ? {
                  parentFirstName: family.parentFirstName,
                  parentLastName: family.parentLastName,
                  parentEmail: family.parentEmail,
                  parentPhone: family.parentPhone,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
