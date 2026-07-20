import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteSessionButton } from "@/components/admin/delete-session-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { getAdminSessions } from "@/lib/admin-data";
import {
  formatPrice,
  formatSessionDateShort,
  formatSessionTime,
} from "@/lib/format";

export default async function AdminSessionsPage() {
  const profile = await requireStaff();
  const sessions = await getAdminSessions();

  return (
    <AdminShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">Sessions</h2>
            <p className="text-sm text-muted-foreground">
              Create, publish, and manage training sessions
            </p>
          </div>
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/admin/sessions/new">New session</Link>
          </Button>
        </div>

        <div className="grid gap-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{session.status}</Badge>
                  {session.session_type?.name ? (
                    <Badge variant="outline">{session.session_type.name}</Badge>
                  ) : null}
                </div>
                <h3 className="font-heading text-lg tracking-wide">
                  {session.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatSessionDateShort(session.session_date)} ·{" "}
                  {formatSessionTime(session.start_time)} ·{" "}
                  {session.booked_count ?? 0}/{session.capacity} ·{" "}
                  {formatPrice(session.price_cents)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/sessions/${session.id}/roster`}>
                    Roster
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/sessions/${session.id}/edit`}>Edit</Link>
                </Button>
                <DeleteSessionButton
                  sessionId={session.id}
                  title={session.title}
                  bookedCount={session.booked_count ?? 0}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
