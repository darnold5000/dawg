import Link from "next/link";
import { redirect } from "next/navigation";
import { FamilyLoginForm } from "@/components/public/family-login-form";
import {
  getAuthenticatedFamily,
  intakePath,
  sanitizeReturnPath,
} from "@/lib/family-auth";
import { parentHasAnyIntake } from "@/lib/intake";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Continue",
  description:
    "Enter your email for a secure DAWG link to complete intake, sign in, or claim your account.",
  path: "/my/login",
});

export default async function FamilyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const q = await searchParams;
  const returnTo = sanitizeReturnPath(q.return, "/schedule");

  const family = await getAuthenticatedFamily();
  if (family) {
    const hasIntake = await parentHasAnyIntake(family.parentId);
    if (!hasIntake) {
      redirect(intakePath(returnTo));
    }
    redirect(returnTo);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">Continue</h1>
      <p className="mt-3 text-muted-foreground">
        Enter your email and we&apos;ll send a secure link. No password needed.
      </p>
      <div className="mt-8">
        <FamilyLoginForm returnTo={returnTo} />
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/packages" className="underline underline-offset-2">
          View packages
        </Link>
      </p>
    </div>
  );
}
