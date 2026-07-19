import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { BookingBillingPanel } from "@/components/admin/billing/booking-billing-panel";
import { PaymentStatusBadge } from "@/components/admin/billing/payment-status-badge";
import { requireStaff } from "@/lib/auth";
import { listPaymentTransactions } from "@/lib/billing/adapter";
import { attendanceLabel } from "@/lib/attendance";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { formatSessionDate, formatSessionTime } from "@/lib/format";
import type {
  AttendanceStatus,
  BookingWithRelations,
  PaymentTransaction,
} from "@/lib/types/database";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireStaff();
  const { id } = await params;

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <AdminShell profile={profile}>
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="font-medium">Database not connected</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add Supabase credentials to view booking billing details.
          </p>
        </div>
      </AdminShell>
    );
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.bookings)
    .select(
      `
      *,
      session:dawg_sessions (*),
      parent:dawg_parents (*),
      athlete:dawg_athletes (*)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const booking = data as BookingWithRelations;
  const txResult = await listPaymentTransactions(id);
  const transactions: PaymentTransaction[] = txResult.ok ? txResult.data : [];

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href="/admin/bookings"
            className="text-sm text-muted-foreground underline underline-offset-2"
          >
            ← Bookings
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-3xl tracking-wide">
                {booking.confirmation_number}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {booking.session
                  ? `${booking.session.title} · ${formatSessionDate(booking.session.session_date)} ${formatSessionTime(booking.session.start_time)}`
                  : booking.session_id}
              </p>
            </div>
            <PaymentStatusBadge status={booking.payment_status} />
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Parent
            </h3>
            <p className="mt-2 font-medium">
              {booking.parent
                ? `${booking.parent.first_name} ${booking.parent.last_name}`
                : "—"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {booking.parent?.email ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {booking.parent?.phone ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Athlete
            </h3>
            <p className="mt-2 font-medium">
              {booking.athlete
                ? `${booking.athlete.first_name} ${booking.athlete.last_name}`
                : "—"}
            </p>
            <p className="mt-2 text-sm capitalize text-muted-foreground">
              Booking: {booking.status}
            </p>
            <p className="text-sm text-muted-foreground">
              Attendance:{" "}
              {attendanceLabel(
                (booking.attendance_status ?? "registered") as AttendanceStatus,
              )}
            </p>
          </div>
        </section>

        {booking.customer_notes ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Parent notes
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm">
              {booking.customer_notes}
            </p>
          </section>
        ) : null}

        <BookingBillingPanel booking={booking} transactions={transactions} />
      </div>
    </AdminShell>
  );
}
