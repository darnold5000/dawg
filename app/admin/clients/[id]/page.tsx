import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AgreementsSummary } from "@/components/admin/agreements-summary";
import { ClientEmailForm } from "@/components/admin/client-email-form";
import { PaymentStatusBadge } from "@/components/admin/billing/payment-status-badge";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { getClientFamily } from "@/lib/admin-clients";
import { formatDate } from "@/lib/billing/format";
import {
  formatSessionDateShort,
  formatSessionTime,
} from "@/lib/format";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireStaff();
  const { id } = await params;
  const family = await getClientFamily(id);
  if (!family) notFound();

  const { parent, athletes, bookings } = family;
  const mailto = `mailto:${encodeURIComponent(parent.email)}?subject=${encodeURIComponent(
    "Message from DAWG Youth Training",
  )}`;
  const tel = parent.phone
    ? `tel:${parent.phone.replace(/[^\d+]/g, "")}`
    : null;

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href="/admin/clients"
            className="text-sm text-muted-foreground underline underline-offset-2"
          >
            ← Clients
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-3xl tracking-wide">
                {parent.first_name} {parent.last_name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {family.bookingCount} booking
                {family.bookingCount === 1 ? "" : "s"}
                {family.lastBookedAt
                  ? ` · last ${formatDate(family.lastBookedAt)}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={mailto}>
                  <Mail className="mr-2 size-4" />
                  Open in email app
                </a>
              </Button>
              {tel ? (
                <Button asChild variant="outline" size="sm">
                  <a href={tel}>
                    <Phone className="mr-2 size-4" />
                    Call
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Parent contact
          </h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">
                <a
                  href={mailto}
                  className="underline underline-offset-2"
                >
                  {parent.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">
                {tel ? (
                  <a href={tel} className="underline underline-offset-2">
                    {parent.phone}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3">
          <h3 className="font-heading text-xl tracking-wide">Athletes</h3>
          {athletes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No athletes on file for this family.
            </p>
          ) : (
            <div className="grid gap-3">
              {athletes.map((athlete) => (
                <div
                  key={athlete.id}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <p className="font-medium">
                    {athlete.first_name} {athlete.last_name}
                    {athlete.age != null ? (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        Age {athlete.age}
                      </span>
                    ) : null}
                  </p>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Date of birth</dt>
                      <dd>{athlete.date_of_birth || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Primary sport</dt>
                      <dd>{athlete.primary_sport || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Experience</dt>
                      <dd>{athlete.experience_level || "—"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">
                        Medical / physical notes
                      </dt>
                      <dd className="mt-0.5 whitespace-pre-wrap">
                        {athlete.medical_notes?.trim() || "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading text-xl tracking-wide">Email parent</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Sends through Resend. Replies go to the DAWG contact email.
          </p>
          <div className="mt-4">
            <ClientEmailForm
              parentId={parent.id}
              parentEmail={parent.email}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-heading text-xl tracking-wide">
            Recent bookings
          </h3>
          {bookings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No bookings yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">Confirmation</th>
                    <th className="px-3 py-2.5">Session</th>
                    <th className="hidden px-3 py-2.5 sm:table-cell">
                      Athlete
                    </th>
                    <th className="hidden px-3 py-2.5 md:table-cell">
                      Agreements
                    </th>
                    <th className="px-3 py-2.5">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-t border-border">
                      <td className="px-3 py-2.5 font-medium">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="underline underline-offset-2"
                        >
                          {booking.confirmation_number}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {booking.session
                          ? `${booking.session.title} · ${formatSessionDateShort(booking.session.session_date)} ${formatSessionTime(booking.session.start_time)}`
                          : "—"}
                      </td>
                      <td className="hidden px-3 py-2.5 sm:table-cell">
                        {booking.athlete
                          ? `${booking.athlete.first_name} ${booking.athlete.last_name}`
                          : "—"}
                      </td>
                      <td className="hidden px-3 py-2.5 md:table-cell">
                        <AgreementsSummary booking={booking} compact />
                      </td>
                      <td className="px-3 py-2.5">
                        <PaymentStatusBadge status={booking.payment_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
