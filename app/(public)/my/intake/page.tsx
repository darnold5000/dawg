import Link from "next/link";
import { redirect } from "next/navigation";
import { FamilyIntakeForm } from "@/components/public/family-intake-form";
import {
  getAuthenticatedFamily,
  intakePath,
  loginPath,
  sanitizeReturnPath,
} from "@/lib/family-auth";
import { getParentById, isParentAccountClaimed } from "@/lib/parent-account";
import { parentHasAnyIntake } from "@/lib/intake";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Athlete intake",
  description:
    "Complete one-time athlete intake before booking DAWG Youth Training sessions.",
  path: "/my/intake",
});

export default async function FamilyIntakePage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const q = await searchParams;
  const returnTo = sanitizeReturnPath(q.return, "/schedule");

  const family = await getAuthenticatedFamily();
  if (family) {
    const hasIntake = await parentHasAnyIntake(family.parentId);
    if (hasIntake) {
      redirect(returnTo);
    }
  }

  let heading = "Complete athlete intake";
  let description =
    "One-time intake is required before we can confirm a training session. Portal access is optional — you can claim your account later to view credits and history.";

  if (family) {
    const parent = await getParentById(family.parentId);
    const existingParent = Boolean(parent);
    const unclaimed = parent ? !(await isParentAccountClaimed(parent.id)) : false;

    if (existingParent && unclaimed) {
      heading = "Complete intake to continue";
      description =
        "We already have your family on file. Finish intake for this athlete, then return to your booking.";
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">{heading}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <div className="mt-8">
        <FamilyIntakeForm
          returnTo={returnTo}
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
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href={loginPath(returnTo)} className="underline underline-offset-2">
          Email me a secure link instead
        </Link>
      </p>
    </div>
  );
}
