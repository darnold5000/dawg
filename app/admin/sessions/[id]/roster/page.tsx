import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
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

  const csvRows = [
    [
      "Athlete",
      "Age",
      "Parent",
      "Phone",
      "Email",
      "Sport",
      "Payment",
      "Status",
      "Notes",
    ].join(","),
    ...bookings.map((b) =>
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
        (b.customer_notes ?? "").replace(/,/g, ";"),
      ].join(","),
    ),
  ];
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvRows.join("\n"))}`;

  return (
    <AdminShell profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl tracking-wide">Roster</h2>
            <p className="text-sm text-muted-foreground">
              {session.title} · {formatSessionDate(session.session_date)} ·{" "}
              {formatSessionTime(session.start_time)} · {bookings.length}/
              {session.capacity}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href={csvHref} download={`dawg-roster-${session.id}.csv`}>
                Export CSV
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/sessions">Back</Link>
            </Button>
          </div>
        </div>

        {bookings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">
            No registrations yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">Athlete</th>
                  <th className="px-3 py-2 font-medium">Age</th>
                  <th className="px-3 py-2 font-medium">Parent</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      {b.athlete?.first_name} {b.athlete?.last_name}
                    </td>
                    <td className="px-3 py-2">
                      {b.athlete?.date_of_birth
                        ? athleteAgeFromDob(b.athlete.date_of_birth)
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {b.parent?.first_name} {b.parent?.last_name}
                      <div className="text-xs text-muted-foreground">
                        {b.parent?.email}
                      </div>
                    </td>
                    <td className="px-3 py-2">{b.parent?.phone}</td>
                    <td className="px-3 py-2">{b.status}</td>
                    <td className="px-3 py-2">{b.payment_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
