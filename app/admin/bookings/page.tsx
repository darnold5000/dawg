import { AdminShell } from "@/components/admin/admin-shell";
import { PaymentStatusBadge } from "@/components/admin/billing/payment-status-badge";
import { requireStaff } from "@/lib/auth";
import { getAdminSessions } from "@/lib/admin-data";
import { billingTableClassNames, formatMoney } from "@/lib/billing";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { formatSessionDateShort, formatSessionTime } from "@/lib/format";
import type { Booking } from "@/lib/types/database";

export default async function AdminBookingsPage() {
  const profile = await requireStaff();
  const sessions = await getAdminSessions();
  const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s]));

  let bookings: Booking[] = [];
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from(DAWG_TABLES.bookings)
        .select("*")
        .order("booked_at", { ascending: false })
        .limit(100);
      bookings = (data as Booking[]) ?? [];
    } catch {
      bookings = [];
    }
  }

  return (
    <AdminShell profile={profile}>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-3xl tracking-wide">Bookings</h2>
          <p className="text-sm text-muted-foreground">
            Recent reservations · payment status and amounts
          </p>
        </div>

        {bookings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">
            No bookings yet
            {!isSupabaseConfigured()
              ? " (connect Supabase to see live bookings)."
              : "."}
          </p>
        ) : (
          <div className={billingTableClassNames.tableWrap}>
            <table className={billingTableClassNames.table}>
              <thead className={billingTableClassNames.tableHead}>
                <tr>
                  <th className="px-4 py-3">Confirmation</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Paid</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const session = sessionMap[booking.session_id];
                  return (
                    <tr
                      key={booking.id}
                      className={billingTableClassNames.tableRow}
                    >
                      <td className="px-4 py-3 font-medium">
                        {booking.confirmation_number}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {session
                          ? `${session.title} · ${formatSessionDateShort(session.session_date)} ${formatSessionTime(session.start_time)}`
                          : booking.session_id}
                      </td>
                      <td className="px-4 py-3 capitalize">{booking.status}</td>
                      <td className="px-4 py-3 text-sm">
                        {booking.payment_method?.replaceAll("_", " ") ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={booking.payment_status} />
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(
                          booking.amount_due_cents,
                          booking.currency?.toUpperCase() || "USD",
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(
                          booking.amount_paid_cents,
                          booking.currency?.toUpperCase() || "USD",
                        )}
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
