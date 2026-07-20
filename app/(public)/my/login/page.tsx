import Link from "next/link";
import { redirect } from "next/navigation";
import { FamilyLoginForm } from "@/components/public/family-login-form";
import {
  getAuthenticatedFamily,
  loginPath,
  registerPath,
  requireFamilyWithIntake,
  sanitizeReturnPath,
  setAuthReturnCookie,
} from "@/lib/family-auth";
import { parentHasAnyIntake } from "@/lib/intake";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Sign in",
  description: "Sign in to book DAWG Youth Training sessions and manage packages.",
  path: "/my/login",
});

export default async function FamilyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const q = await searchParams;
  const returnTo = sanitizeReturnPath(q.return, "/schedule");
  await setAuthReturnCookie(returnTo);

  const family = await getAuthenticatedFamily();
  if (family) {
    const hasIntake = await parentHasAnyIntake(family.parentId);
    if (!hasIntake) {
      redirect(registerPath(returnTo));
    }
    redirect(returnTo);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">Sign in</h1>
      <p className="mt-3 text-muted-foreground">
        Sign in to book sessions, buy packages, and track your credits.
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
