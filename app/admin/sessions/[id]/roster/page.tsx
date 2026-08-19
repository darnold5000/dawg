import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { RosterAttendance } from "@/components/admin/roster-attendance";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { getSessionRoster } from "@/lib/admin-data";
import { getAthleteBookingReadinessMap } from "@/lib/intake";
import { isAdminRole } from "@/lib/roles";
import {
  hardDeleteBlockReason,
  isAwaitingPaymentHold,
  isConfirmedRosterBooking,
  occupancyFromSession,
  staffOccupancyLabel,
} from "@/lib/booking-roster";
import { getPackageRedemptionsForBookings } from "@/lib/admin-package-redemptions";
import { athleteAgeFromDob, formatAdminHoldUntil, formatSessionDate, formatSessionTime } from "@/lib/format";

export default async function RosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireStaff();
  const { id } = await params;
  const { session, bookings } = await getSessionRoster(id);
  if (!session) notFound();

  const confirmedBookings = bookings.filter((b) => isConfirmedRosterBooking(b));
  const paymentHolds = bookings.filter((b) => isAwaitingPaymentHold(b));
  const packageByBooking = await getPackageRedemptionsForBookings(
    confirmedBookings.map((b) => b.id),
  );
  const removalByBookingId = Object.fromEntries(
    confirmedBookings.map((b) => {
      const reason = hardDeleteBlockReason(b, {
        hasRedemption: packageByBooking.has(b.id),
      });
      return [b.id, { canRemove: reason == null, reason }];
    }),
  );

  const readinessByAthleteId = Object.fromEntries(
    await getAthleteBookingReadinessMap(
      confirmedBookings.map((b) => b.athlete_id),
    ),
  );

  const occupancy = occupancyFromSession({
    capacity: session.capacity,
    confirmed_count: confirmedBookings.length,
    pending_hold_count: paymentHolds.length,
  });

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
    ...confirmedBookings.map((b) =>
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
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">Roster</h2>
            <p className="text-sm text-muted-foreground">
              {session.title} · {formatSessionDate(session.session_date)} ·{" "}
              {formatSessionTime(session.start_time)} ·{" "}
              {staffOccupancyLabel(occupancy, session.capacity)}
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

        {confirmedBookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <p className="font-medium">No confirmed registrations yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Athletes appear here after payment is completed, or immediately
              for pay-at-facility and package-credit bookings.
            </p>
          </div>
        ) : (
          <RosterAttendance
            bookings={confirmedBookings}
            readinessByAthleteId={readinessByAthleteId}
            removalByBookingId={removalByBookingId}
            showRemove={Boolean(profile.role && isAdminRole(profile.role))}
          />
        )}

        {paymentHolds.length > 0 ? (
          <section className="space-y-3">
            <div>
              <h3 className="font-heading text-xl tracking-wide">
                Temporary holds / Awaiting payment
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                These spots are reserved while online payment is completed.
                They are not booked and do not have attendance.
              </p>
            </div>
            <ul className="grid gap-3 lg:grid-cols-2">
              {paymentHolds.map((booking) => {
                const until = formatAdminHoldUntil(booking.booking_expires_at);
                return (
                  <li
                    key={booking.id}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold text-[#1c1917]">
                      {booking.athlete?.first_name} {booking.athlete?.last_name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#44403c]">
                      {booking.parent?.first_name} {booking.parent?.last_name}
                      {booking.parent?.phone ? ` · ${booking.parent.phone}` : ""}
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#78350f]">
                      Awaiting payment
                    </p>
                    <p className="text-xs text-[#1c1917]">
                      {until ? `Spot held until ${until}` : "Spot held"}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </AdminShell>
  );
}
