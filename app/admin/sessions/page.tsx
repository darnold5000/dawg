import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  ScheduleSessionsView,
  type ScheduleSessionItem,
} from "@/components/admin/schedule-sessions-view";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { getAdminSessions } from "@/lib/admin-data";

function toScheduleItems(
  sessions: Awaited<ReturnType<typeof getAdminSessions>>,
): ScheduleSessionItem[] {
  const today = new Date().toISOString().slice(0, 10);
  return sessions
    .filter((s) => s.session_date >= today && s.status !== "cancelled")
    .sort((a, b) => {
      if (a.session_date !== b.session_date) {
        return a.session_date.localeCompare(b.session_date);
      }
      return a.start_time.localeCompare(b.start_time);
    })
    .map((s) => ({
      id: s.id,
      session_date: s.session_date,
      start_time: s.start_time,
      title: s.title,
      program_name: s.program?.name ?? null,
      calendar_color: s.program?.calendar_color ?? null,
      capacity: s.capacity,
      booked_count: s.booked_count ?? 0,
      trainer_name: s.trainer?.name ?? null,
    }));
}

export default async function AdminSessionsPage() {
  const profile = await requireStaff();
  const sessions = await getAdminSessions();
  const today = new Date().toISOString().slice(0, 10);
  const items = toScheduleItems(sessions);

  return (
    <AdminShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">Schedule</h2>
            <p className="text-sm text-muted-foreground">
              Your class schedule — add saved{" "}
              <Link href="/admin/classes" className="text-brand underline">
                classes
              </Link>{ " "}
              for parents to book. Standard weekly setup skips duplicate times
              (does not override existing sessions).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Link href="/admin/sessions/weekly">Standard weekly setup</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/sessions/manage">Manage schedules</Link>
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <p className="font-medium">No classes on your schedule yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use standard weekly setup for Little/Big Dawgs blocks, or add one
              class at a time.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                asChild
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <Link href="/admin/sessions/weekly">Standard weekly setup</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/sessions/add">+ Add class</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Need a new time slot?{" "}
              <Link href="/admin/classes/new" className="text-brand underline">
                Create a class
              </Link>{ " "}
              first. Private lessons:{" "}
              <Link
                href="/admin/programs#private-lessons"
                className="text-brand underline"
              >
                Programs
              </Link>
              .
            </p>
          </div>
        ) : (
          <ScheduleSessionsView sessions={items} today={today} />
        )}
      </div>
    </AdminShell>
  );
}
