import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/admin-data";
import { formatSessionTime } from "@/lib/format";

export default async function AdminDashboardPage() {
  const profile = await requireStaff();
  const metrics = await getDashboardMetrics();

  const cards = [
    { label: "Today's sessions", value: metrics.todaysSessions.length },
    { label: "This week's bookings", value: metrics.weekBookings },
    { label: "Available spots (7 days)", value: metrics.availableSpots },
    { label: "Upcoming private lessons", value: metrics.privateUpcoming },
    { label: "Revenue this month", value: "—" },
    { label: "Waitlisted athletes", value: metrics.waitlisted },
  ];

  return (
    <AdminShell profile={profile}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">Overview</h2>
            <p className="text-sm text-muted-foreground">
              Today&apos;s training and booking snapshot
            </p>
          </div>
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/admin/sessions/new">Create session</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 font-heading text-3xl tracking-wide">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <section>
          <h3 className="font-heading text-xl tracking-wide">Today</h3>
          <div className="mt-4 grid gap-3">
            {metrics.todaysSessions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No sessions scheduled for today.
              </p>
            ) : (
              metrics.todaysSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm text-brand">
                      {formatSessionTime(session.start_time)}
                    </p>
                    <p className="font-heading text-lg tracking-wide">
                      {session.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.trainer?.name ?? "Unassigned"} ·{" "}
                      {session.booked_count ?? 0}/{session.capacity} registered
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/admin/sessions/${session.id}/roster`}>
                      View roster
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
