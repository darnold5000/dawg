import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/admin-data";
import { formatSessionTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const profile = await requireStaff();
  const metrics = await getDashboardMetrics();

  const cards: Array<{
    label: string;
    value: string | number;
    href?: string;
    hint: string;
  }> = [
    {
      label: "Today's sessions",
      value: metrics.todaysSessions.length,
      href: "/admin/sessions",
      hint: "View all sessions",
    },
    {
      label: "This week's bookings",
      value: metrics.weekBookings,
      href: "/admin/bookings",
      hint: "Open bookings",
    },
    {
      label: "Available spots (7 days)",
      value: metrics.availableSpots,
      href: "/admin/sessions",
      hint: "Manage capacity",
    },
    {
      label: "Upcoming private lessons",
      value: metrics.privateUpcoming,
      href: "/admin/availability",
      hint: "Manage availability",
    },
    {
      label: "Waitlisted athletes",
      value: metrics.waitlisted,
      href: "/admin/bookings",
      hint: "Review waitlist / bookings",
    },
    {
      label: "Revenue this month",
      value: "—",
      hint: "Stripe coming later",
    },
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
          {cards.map((card) => {
            const className = cn(
              "rounded-xl border border-border bg-card p-5 shadow-sm transition",
              card.href &&
                "hover:border-ink/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
            );

            const body = (
              <>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 font-heading text-3xl tracking-wide">
                  {card.value}
                </p>
                <p
                  className={cn(
                    "mt-3 text-xs font-medium",
                    card.href ? "text-ink" : "text-muted-foreground",
                  )}
                >
                  {card.hint}
                  {card.href ? " →" : ""}
                </p>
              </>
            );

            return card.href ? (
              <Link key={card.label} href={card.href} className={className}>
                {body}
              </Link>
            ) : (
              <div key={card.label} className={className}>
                {body}
              </div>
            );
          })}
        </div>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="font-heading text-xl tracking-wide">Today</h3>
            <Link
              href="/admin/sessions"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              All sessions →
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {metrics.todaysSessions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No sessions scheduled for today.{" "}
                <Link
                  href="/admin/sessions/new"
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Create one
                </Link>
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
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline">
                      <Link href={`/admin/sessions/${session.id}/roster`}>
                        View roster
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/admin/sessions/${session.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
