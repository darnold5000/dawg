import { FamilyDashboard } from "@/components/public/family-dashboard";
import { FamilyLoginForm } from "@/components/public/family-login-form";
import { getAuthenticatedFamily } from "@/lib/family-portal";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "My account",
  description:
    "View your DAWG athletes, training packages, remaining credits, and session history.",
  path: "/my",
});

export default async function MyAccountPage() {
  const data = await getAuthenticatedFamily();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">My account</h1>
      <p className="mt-3 text-muted-foreground">
        Track your family, package balances, and which sessions you have used.
      </p>

      <div className="mt-8">
        {data ? <FamilyDashboard data={data} /> : <FamilyLoginForm />}
      </div>
    </div>
  );
}
