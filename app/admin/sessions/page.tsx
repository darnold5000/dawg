import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteSessionButton } from "@/components/admin/delete-session-button";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { getAdminSessions } from "@/lib/admin-data";
import {
  formatScheduleDaySubdate,
  formatScheduleWeekday,
  formatSessionTime,
} from "@/lib/format";

function groupSessionsByDate(
  sessions: Awaited<ReturnType<typeof getAdminSessions>>,
) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sessions
    .filter((s) => s.session_date >= today && s.status !== "cancelled")
    .sort((a, b) => {
      if (a.session_date !== b.session_date) {
        return a.session_date.localeCompare(b.session_date);
      }
      return a.start_time.localeCompare(b.start_time);
    });

  const byDate = new Map<string, typeof upcoming>();
  for (const session of upcoming) {
    const list = byDate.get(session.session_date) ?? [];
    list.push(session);
    byDate.set(session.session_date, list);
  }
  return { today, upcoming, byDate };
}

export default async function AdminSessionsPage() {
  const profile = await requireStaff();
  const sessions = await getAdminSessions();
  const { today, upcoming, byDate } = groupSessionsByDate(sessions);
  const displayDates = [...byDate.keys()].slice(0, 14);

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
              for parents to book.
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
              <Link href="/admin/sessions/add">+ Add class</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/sessions/new">Manual session</Link>
            </Button>
          </div>
        </div>

        {upcoming.length === 0 ? (
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
              first.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayDates.map((dateKey) => {
              const daySessions = byDate.get(dateKey) ?? [];
              const isToday = dateKey === today;
              return (
                <section key={dateKey} className="space-y-3">
                  <div>
                    <h3 className="font-heading text-lg tracking-widest">
                      {formatScheduleWeekday(dateKey)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatScheduleDaySubdate(dateKey)}
                      {isToday ? " · Today" : ""}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {daySessions.map((session) => {
                      const color = session.program?.calendar_color;
                      return (
                        <div
                          key={session.id}
                          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {color ? (
                                <span
                                  className="inline-block h-3 w-3 rounded-full"
                                  style={{ backgroundColor: color }}
                                  aria-hidden
                                />
                              ) : null}
                              <span className="font-medium tabular-nums">
                                {formatSessionTime(session.start_time)}
                              </span>
                              <span className="font-heading tracking-wide">
                                {session.program?.name ?? session.title}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {session.booked_count ?? 0}/{session.capacity}{" "}
                              booked
                              {session.trainer?.name
                                ? ` · ${session.trainer.name}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/sessions/${session.id}/roster`}>
                                Roster
                              </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/sessions/${session.id}/edit`}>
                                Edit
                              </Link>
                            </Button>
                            <DeleteSessionButton
                              sessionId={session.id}
                              title={session.title}
                              bookedCount={session.booked_count ?? 0}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {byDate.size > displayDates.length ? (
              <p className="text-sm text-muted-foreground">
                Showing the next {displayDates.length} days with sessions. Older
                or later dates are still on the public schedule.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
