import Link from "next/link";
import { redirect } from "next/navigation";
import { FamilyRegisterForm } from "@/components/public/family-register-form";
import {
  getAuthenticatedFamily,
  loginPath,
  sanitizeReturnPath,
} from "@/lib/family-auth";
import { parentHasAnyIntake } from "@/lib/intake";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Create account",
  description:
    "Create your DAWG family account and complete athlete intake before booking.",
  path: "/my/register",
});

export default async function FamilyRegisterPage({
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">Create account</h1>
      <p className="mt-3 text-muted-foreground">
        New families complete intake once, then book sessions and purchase
        packages while signed in.
      </p>
      <div className="mt-8">
        <FamilyRegisterForm returnTo={returnTo} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href={loginPath(returnTo)} className="underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
