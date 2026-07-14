import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth";
import { getAdminSessions } from "@/lib/admin-data";
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
            Recent reservations across all sessions
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
          <div className="grid gap-3">
            {bookings.map((booking) => {
              const session = sessionMap[booking.session_id];
              return (
                <div
                  key={booking.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{booking.confirmation_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.status} · {booking.payment_status}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {session
                      ? `${session.title} · ${formatSessionDateShort(session.session_date)} ${formatSessionTime(session.start_time)}`
                      : booking.session_id}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
