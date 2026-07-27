import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { WeeklyScheduleWizard } from "@/components/admin/weekly-schedule-wizard";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { listSessionTemplates } from "@/lib/session-templates";

export default async function WeeklyScheduleSetupPage() {
  const profile = await requireAdmin();
  const classes = await listSessionTemplates({ includeInactive: false });

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">
              Weekly schedule setup
            </h2>
            <p className="text-sm text-muted-foreground">
              One flow for Avery&apos;s usual Monday–Friday blocks — all classes
              in a few clicks.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/sessions">Back to schedule</Link>
          </Button>
        </div>
        <WeeklyScheduleWizard classes={classes} />
      </div>
    </AdminShell>
  );
}
