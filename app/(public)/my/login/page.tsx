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
import { SITE } from "@/lib/constants";

export const metadata = createMetadata({
  title: "Family access",
  description: `Access your ${SITE.name} family account with a secure email link.`,
  path: "/my/login",
});

export default async function FamilyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const q = await searchParams;
  const returnTo = sanitizeReturnPath(q.return, "/my");

  const family = await getAuthenticatedFamily();
  if (family) {
    const hasIntake = await parentHasAnyIntake(family.parentId);
    if (!hasIntake) {
      redirect(intakePath(returnTo));
    }
    redirect(returnTo);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">Family access</h1>
      <p className="mt-3 text-muted-foreground">
        Enter your email for a secure link to get started or open your account.
        No password needed — booking and purchasing stay available without
        signing in.
      </p>
      <div className="mt-6">
        <FamilyLoginForm returnTo={returnTo} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Prefer to skip this?{" "}
        <Link href="/schedule" className="underline underline-offset-2">
          Book a session
        </Link>{" "}
        or{" "}
        <Link href="/packages" className="underline underline-offset-2">
          buy packages
        </Link>{" "}
        anytime.
      </p>
    </div>
  );
}
