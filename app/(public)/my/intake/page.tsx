import Link from "next/link";
import { FamilyIntakeForm } from "@/components/public/family-intake-form";
import {
  getAuthenticatedFamily,
  loginPath,
  sanitizeReturnPath,
} from "@/lib/family-auth";
import { getIntakeFormContext } from "@/lib/intake";
import { IntakeAlreadyComplete } from "@/components/public/intake-complete-prompts";
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
  searchParams: Promise<{ return?: string; athleteId?: string }>;
}) {
  const q = await searchParams;
  const returnTo = sanitizeReturnPath(q.return, "/schedule");
  const athleteId = q.athleteId?.trim() || null;

  const family = await getAuthenticatedFamily();
  const context = await getIntakeFormContext({
    parentId: family?.parentId,
    email: family?.parentEmail,
    athleteId,
  });

  let heading = "Complete athlete intake";
  let description =
    "One-time intake is required before we can confirm a training session. Creating an online account is optional — it lets you view credits and booking history later.";

  if (context.mode === "add-athlete") {
    heading = "Add another athlete";
    description =
      "Your family contact and emergency info are already on file. Add this athlete to continue.";
  } else if (context.mode === "waiver-only") {
    heading = "Updated waiver";
    description =
      "Our liability waiver has been updated. Review and accept to continue — your other information stays on file.";
  }

  if (context.alreadyComplete) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
        <IntakeAlreadyComplete
          returnTo={returnTo}
          athleteName={
            context.athlete
              ? `${context.athlete.firstName} ${context.athlete.lastName}`
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">{heading}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <div className="mt-8">
        <FamilyIntakeForm
          returnTo={returnTo}
          athleteId={athleteId}
          initialContact={
            family
              ? {
                  parentFirstName: family.parentFirstName,
                  parentLastName: family.parentLastName,
                  parentEmail: family.parentEmail,
                  parentPhone: family.parentPhone,
                }
              : context.parent
                ? {
                    parentFirstName: context.parent.firstName,
                    parentLastName: context.parent.lastName,
                    parentEmail: context.parent.email,
                    parentPhone: context.parent.phone,
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
