import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/admin-data";
import { formatMoney } from "@/lib/billing/format";
import { formatSessionTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const profile = await requireStaff();
  const metrics = await getDashboardMetrics();
  const todaySorted = [...metrics.todaysSessions].sort((a, b) =>
    a.start_time.localeCompare(b.start_time),
  );

  const cards: Array<{
    label: string;
    value: string | number;
    href?: string;
    hint: string;
  }> = [
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
      href: "/admin/programs#private-lessons",
      hint: "Create slots in Programs",
    },
    {
      label: "Waitlisted athletes",
      value: metrics.waitlisted,
      href: "/admin/bookings",
      hint: "Review waitlist / bookings",
    },
    {
      label: "Revenue this month",
      value: formatMoney(metrics.revenueThisMonth),
      href: "/admin/bookings",
      hint: "Paid online + marked paid at facility",
    },
  ];

  return (
    <AdminShell profile={profile}>
      <div className="space-y-8">
        <section className="rounded-xl border border-brand/25 bg-brand/5 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                Today
              </p>
              <h2 className="mt-1 font-heading text-3xl tracking-wide">
                Today&apos;s schedule
              </h2>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/sessions">Full schedule</Link>
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {todaySorted.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card/80 p-6 text-sm text-muted-foreground">
                No classes today.{" "}
                <Link
                  href="/admin/sessions"
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  View schedule
                </Link>
              </p>
            ) : (
              todaySorted.map((session) => {
                const color = session.program?.calendar_color;
                const name =
                  session.program?.name ?? session.title;
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
                        <span className="font-heading text-lg tracking-wide">
                          {name}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.booked_count ?? 0}/{session.capacity} booked
                        {session.trainer?.name
                          ? ` · ${session.trainer.name}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      asChild
                      className="bg-brand text-brand-foreground hover:bg-brand/90 shrink-0"
                    >
                      <Link href={`/admin/sessions/${session.id}/roster`}>
                        View roster
                      </Link>
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <div>
          <h3 className="font-heading text-xl tracking-wide">Overview</h3>
          <p className="text-sm text-muted-foreground">
            Booking and capacity snapshot
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const className = cn(
              "rounded-xl border border-border bg-card p-5 shadow-sm transition",
              card.href &&
                "hover:border-brand/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
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
      </div>
    </AdminShell>
  );
}
