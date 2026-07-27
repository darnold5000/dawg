import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { ManageRecurringSchedulePanel } from "@/components/admin/manage-recurring-schedule-panel";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getRecurringScheduleSummaries } from "@/lib/recurring-schedule-manage";

export default async function ManageSchedulePage() {
  const profile = await requireAdmin();
  const summaries = await getRecurringScheduleSummaries();

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">
              Manage schedule
            </h2>
            <p className="text-sm text-muted-foreground">
              Extend a season, end classes after a date, or change the start
              time for future sessions.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/sessions">Back to schedule</Link>
          </Button>
        </div>

        <ManageRecurringSchedulePanel summaries={summaries} />
      </div>
    </AdminShell>
  );
}
