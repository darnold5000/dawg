import { AdminShell } from "@/components/admin/admin-shell";
import { SettingsForm } from "@/components/admin/settings-form";
import { StaffSettingsPanel } from "@/components/admin/staff-settings-panel";
import { listStaffMembers } from "@/lib/admin-staff";
import { requireAdmin } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/data";
import { isOwnerRole } from "@/lib/roles";
import { isTrainingDeploymentConfigured } from "@/lib/tenant/deployment";

export default async function AdminSettingsPage() {
  const profile = await requireAdmin();
  const settings = await getBusinessSettings();

  const showStaff =
    isOwnerRole(profile.role) && isTrainingDeploymentConfigured();
  let staff: Awaited<ReturnType<typeof listStaffMembers>> = [];
  if (showStaff) {
    staff = await listStaffMembers();
  }

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-3xl space-y-10">
        <div>
          <h2 className="font-heading text-3xl tracking-wide">
            Business settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Contact details, announcement, and policies used across the site.
          </p>
        </div>
        <SettingsForm settings={settings} />

        {showStaff ? (
          <StaffSettingsPanel
            initialStaff={staff}
            currentUserId={profile.id}
          />
        ) : null}
      </div>
    </AdminShell>
  );
}
