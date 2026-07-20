import { IntakeForm } from "@/components/public/intake-form";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Client intake",
  description:
    "Complete DAWG Youth Training athlete intake and liability waiver before your first booking.",
  path: "/intake",
});

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const q = await searchParams;
  const returnTo =
    q.return && q.return.startsWith("/") ? q.return : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">Client intake</h1>
      <p className="mt-3 text-muted-foreground">
        Required once for each athlete before the first booking. Replaces the
        previous Google Form.
      </p>
      <div className="mt-8">
        <IntakeForm returnTo={returnTo} />
      </div>
    </div>
  );
}
