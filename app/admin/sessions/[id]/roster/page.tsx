import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { RosterAttendance } from "@/components/admin/roster-attendance";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { getSessionRoster } from "@/lib/admin-data";
import { athleteAgeFromDob, formatSessionDate, formatSessionTime } from "@/lib/format";

export default async function RosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireStaff();
  const { id } = await params;
  const { session, bookings } = await getSessionRoster(id);
  if (!session) notFound();

  const activeBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending",
  );

  const csvRows = [
    [
      "Athlete",
      "Age",
      "Parent",
      "Phone",
      "Email",
      "Sport",
      "Payment",
      "Booking",
      "Attendance",
      "Notes",
    ].join(","),
    ...activeBookings.map((b) =>
      [
        `${b.athlete?.first_name ?? ""} ${b.athlete?.last_name ?? ""}`,
        b.athlete?.date_of_birth
          ? athleteAgeFromDob(b.athlete.date_of_birth)
          : "",
        `${b.parent?.first_name ?? ""} ${b.parent?.last_name ?? ""}`,
        b.parent?.phone ?? "",
        b.parent?.email ?? "",
        b.athlete?.primary_sport ?? "",
        b.payment_status,
        b.status,
        b.attendance_status ?? "registered",
        (b.customer_notes ?? "").replace(/,/g, ";"),
      ].join(","),
    ),
  ];
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvRows.join("\n"))}`;

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">Roster</h2>
            <p className="text-sm text-muted-foreground">
              {session.title} · {formatSessionDate(session.session_date)} ·{" "}
              {formatSessionTime(session.start_time)} · {activeBookings.length}/
              {session.capacity}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap attendance on each athlete — optimized for phone use courtside.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={csvHref} download={`dawg-roster-${session.id}.csv`}>
                Export CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/sessions">Back</Link>
            </Button>
          </div>
        </div>

        {activeBookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <p className="font-medium">No registrations yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Athletes will appear here once parents book this session.
            </p>
          </div>
        ) : (
          <RosterAttendance bookings={activeBookings} />
        )}
      </div>
    </AdminShell>
  );
}
