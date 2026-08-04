import { redirect } from "next/navigation";
import { FamilyDashboard } from "@/components/public/family-dashboard";
import {
  getAuthenticatedFamily,
  intakePath,
  loginPath,
} from "@/lib/family-auth";
import { getFamilyPortalForSession } from "@/lib/family-portal";
import { parentHasAnyIntake } from "@/lib/intake";
import { createMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

export const metadata = createMetadata({
  title: "My account",
  description: `View bookings, credits, and athletes for your ${SITE.name} family.`,
  path: "/my",
});

export default async function MyAccountPage() {
  const family = await getAuthenticatedFamily();
  if (!family) {
    redirect(loginPath("/my"));
  }

  const hasIntake = await parentHasAnyIntake(family.parentId);
  if (!hasIntake) {
    redirect(intakePath("/my"));
  }

  const data = await getFamilyPortalForSession();
  if (!data) {
    redirect(loginPath("/my"));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">My account</h1>
      <p className="mt-3 text-muted-foreground">
        Bookings, package credits, and athletes for your family.
      </p>
      <div className="mt-8">
        <FamilyDashboard data={data} />
      </div>
    </div>
  );
}
