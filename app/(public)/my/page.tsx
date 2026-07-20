import { FamilyDashboard } from "@/components/public/family-dashboard";
import {
  claimPath,
  getAuthenticatedFamily,
  loginPath,
} from "@/lib/family-auth";
import { getFamilyPortalForSession } from "@/lib/family-portal";
import { isParentAccountClaimed } from "@/lib/parent-account";
import { createMetadata } from "@/lib/seo";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = createMetadata({
  title: "My account",
  description:
    "View your DAWG athletes, upcoming sessions, training packages, and remaining credits.",
  path: "/my",
});

export default async function MyAccountPage() {
  const data = await getFamilyPortalForSession();
  const family = data ? null : await getAuthenticatedFamily();
  const unclaimed =
    family && !(await isParentAccountClaimed(family.parentId));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">My account</h1>
      <p className="mt-3 text-muted-foreground">
        Track your family, upcoming sessions, package balances, and session history.
      </p>

      <div className="mt-8">
        {data ? (
          <FamilyDashboard data={data} />
        ) : unclaimed ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
            Hi {family.parentFirstName}, your family is on file. Create your
            online account to view credits, bookings, and athletes in one place.
            </p>
            <Button
              asChild
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Link href={claimPath("/my")}>Create My Online Account</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your email and we&apos;ll send a secure link to sign in or
              claim your account.
            </p>
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href={loginPath("/my")}>Continue with email</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
