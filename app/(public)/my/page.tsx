import { FamilyDashboard } from "@/components/public/family-dashboard";
import { getFamilyPortalForSession } from "@/lib/family-portal";
import { loginPath } from "@/lib/family-auth";
import { createMetadata } from "@/lib/seo";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = createMetadata({
  title: "My account",
  description:
    "View your DAWG athletes, training packages, remaining credits, and session history.",
  path: "/my",
});

export default async function MyAccountPage() {
  const data = await getFamilyPortalForSession();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">My account</h1>
      <p className="mt-3 text-muted-foreground">
        Track your family, package balances, and which sessions you have used.
      </p>

      <div className="mt-8">
        {data ? (
          <FamilyDashboard data={data} />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in to view your account, or create one to get started.
            </p>
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href={loginPath("/my")}>Sign in</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
