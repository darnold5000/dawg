import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { PaymentStatusBadge } from "@/components/admin/billing/payment-status-badge";
import { requireStaff } from "@/lib/auth";
import {
  adminBookingPaymentTypeLabel,
  getPackageRedemptionsForBookings,
} from "@/lib/admin-booking-display";
import { getAdminSessions } from "@/lib/admin-data";
import { billingTableClassNames, formatMoney } from "@/lib/billing/format";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { formatSessionDateShort, formatSessionTime } from "@/lib/format";
import type { Booking } from "@/lib/types/database";

type BookingListRow = Booking & {
  parent: { first_name: string; last_name: string } | null;
  athlete: { first_name: string; last_name: string } | null;
};

export default async function AdminBookingsPage() {
  const profile = await requireStaff();
  const sessions = await getAdminSessions();
  const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s]));

  let bookings: BookingListRow[] = [];
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from(DAWG_TABLES.bookings)
        .select(
          `
          *,
          parent:dawg_parents ( first_name, last_name ),
          athlete:dawg_athletes ( first_name, last_name )
        `,
        )
        .order("booked_at", { ascending: false })
        .limit(100);
      bookings = (data as BookingListRow[]) ?? [];
    } catch {
      bookings = [];
    }
  }

  const packageByBooking = await getPackageRedemptionsForBookings(
    bookings.map((b) => b.id),
  );

  return (
    <AdminShell profile={profile}>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-3xl tracking-wide">Bookings</h2>
          <p className="text-sm text-muted-foreground">
            Recent reservations · how each session is paid
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <p className="font-medium">No bookings yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {!isSupabaseConfigured()
                ? "Connect Supabase to see live reservations."
                : "New bookings from the public schedule will show up here."}
            </p>
          </div>
        ) : (
          <div className={`${billingTableClassNames.tableWrap} -mx-1`}>
            <table className={billingTableClassNames.table}>
              <thead className={billingTableClassNames.tableHead}>
                <tr>
                  <th className="px-3 py-3 sm:px-4">Confirmation</th>
                  <th className="px-3 py-3 sm:px-4">Athlete</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Parent</th>
                  <th className="px-3 py-3 sm:px-4">Session</th>
                  <th className="hidden px-4 py-3 md:table-cell">Booking</th>
                  <th className="hidden px-4 py-3 lg:table-cell">
                    Payment type
                  </th>
                  <th className="px-3 py-3 sm:px-4">Status</th>
                  <th className="hidden px-3 py-3 sm:table-cell md:table-cell">
                    Due
                  </th>
                  <th className="hidden px-4 py-3 sm:table-cell">Paid</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const session = sessionMap[booking.session_id];
                  const athleteName = booking.athlete
                    ? `${booking.athlete.first_name} ${booking.athlete.last_name}`
                    : "—";
                  const parentName = booking.parent
                    ? `${booking.parent.first_name} ${booking.parent.last_name}`
                    : "—";
                  const paymentType = adminBookingPaymentTypeLabel({
                    paymentStatus: booking.payment_status,
                    paymentMethod: booking.payment_method,
                    packageName: packageByBooking.get(booking.id),
                  });
                  const showAmounts = booking.payment_status !== "not_required";

                  return (
                    <tr
                      key={booking.id}
                      className={billingTableClassNames.tableRow}
                    >
                      <td className="px-3 py-3 font-medium sm:px-4">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="underline underline-offset-2"
                        >
                          {booking.confirmation_number}
                        </Link>
                      </td>
                      <td className="px-3 py-3 font-medium sm:px-4">
                        {athleteName}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {parentName}
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-3 text-muted-foreground sm:max-w-none sm:px-4">
                        {session
                          ? `${session.title} · ${formatSessionDateShort(session.session_date)} ${formatSessionTime(session.start_time)}`
                          : booking.session_id}
                      </td>
                      <td className="hidden px-4 py-3 capitalize md:table-cell">
                        {booking.status}
                      </td>
                      <td className="hidden max-w-[10rem] px-4 py-3 text-sm lg:table-cell">
                        {paymentType}
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <PaymentStatusBadge status={booking.payment_status} />
                      </td>
                      <td className="hidden px-3 py-3 sm:table-cell md:table-cell">
                        {showAmounts
                          ? formatMoney(
                              booking.amount_due_cents,
                              booking.currency?.toUpperCase() || "USD",
                            )
                          : "—"}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        {showAmounts
                          ? formatMoney(
                              booking.amount_paid_cents,
                              booking.currency?.toUpperCase() || "USD",
                            )
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
