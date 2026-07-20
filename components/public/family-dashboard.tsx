"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { forgetRememberedFamily } from "@/lib/returning-family";
import {
  formatPrice,
  formatSessionDateShort,
  formatSessionTime,
} from "@/lib/format";
import { formatDate } from "@/lib/billing/format";
import type { FamilyBooking, FamilyPortalData } from "@/lib/family-portal";
import { attendanceLabel } from "@/lib/attendance";
import type { PaymentStatus } from "@/lib/types/database";

function familyPaymentLabel(status: PaymentStatus): string {
  switch (status) {
    case "not_required":
      return "Included";
    case "unpaid":
      return "Pay at facility";
    case "pending":
      return "Payment pending";
    case "paid":
      return "Paid";
    default:
      return status.replaceAll("_", " ");
  }
}

function FamilyBookingCard({ booking }: { booking: FamilyBooking }) {
  return (
    <li className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium">{booking.sessionTitle}</p>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {familyPaymentLabel(booking.paymentStatus)}
        </span>
      </div>
      <p className="mt-1 text-muted-foreground">
        {formatSessionDateShort(booking.sessionDate)} ·{" "}
        {formatSessionTime(booking.startTime)} · {booking.athleteName}
      </p>
      {booking.locationName ? (
        <p className="mt-1 text-muted-foreground">{booking.locationName}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        Confirmation {booking.confirmationNumber}
        {booking.isUpcoming
          ? ""
          : ` · ${attendanceLabel(booking.attendanceStatus)}`}
      </p>
    </li>
  );
}

export function FamilyDashboard({ data }: { data: FamilyPortalData }) {
  const router = useRouter();

  async function signOut() {
    await forgetRememberedFamily();
    router.push("/my");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <h2 className="font-heading text-2xl tracking-wide">
            {data.parent.firstName} {data.parent.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">{data.parent.email}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>

      <div className="rounded-xl border border-brand/30 bg-brand/5 p-5">
        <p className="text-sm text-muted-foreground">Package credits remaining</p>
        <p className="mt-1 font-heading text-4xl tracking-wide">
          {data.totalCreditsRemaining}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          One-time packs — use credits when you book, then buy again anytime.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/schedule">Book a session</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/packages">Buy more sessions</Link>
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="font-heading text-xl tracking-wide">Upcoming sessions</h3>
        {data.upcomingBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming sessions booked.{" "}
            <Link href="/schedule" className="underline underline-offset-2">
              Browse the schedule
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-2">
            {data.upcomingBookings.map((booking) => (
              <FamilyBookingCard key={booking.id} booking={booking} />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-heading text-xl tracking-wide">Athletes</h3>
        {data.athletes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No athletes on file yet. Purchase a package to add your athlete.
          </p>
        ) : (
          <ul className="grid gap-2">
            {data.athletes.map((athlete) => (
              <li
                key={athlete.id}
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <span className="font-medium">
                  {athlete.first_name} {athlete.last_name}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  · DOB {String(athlete.date_of_birth).slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-heading text-xl tracking-wide">Packages</h3>
        {data.purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No packages yet.{" "}
            <Link href="/packages" className="underline underline-offset-2">
              Purchase sessions
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Package</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Remaining</th>
                  <th className="px-3 py-2.5">Purchased</th>
                </tr>
              </thead>
              <tbody>
                {data.purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-t border-border">
                    <td className="px-3 py-2.5 font-medium">
                      {purchase.package?.name ?? "Package"}
                    </td>
                    <td className="px-3 py-2.5 capitalize">{purchase.status}</td>
                    <td className="px-3 py-2.5">
                      {purchase.sessions_remaining} / {purchase.sessions_total}
                    </td>
                    <td className="px-3 py-2.5">
                      {purchase.paid_at
                        ? formatDate(purchase.paid_at)
                        : purchase.status === "pending"
                          ? "Pending payment"
                          : "—"}
                      {purchase.status === "paid" ? (
                        <span className="block text-xs text-muted-foreground">
                          {formatPrice(purchase.amount_paid_cents)}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.pastBookings.length > 0 ? (
        <section className="space-y-3">
          <h3 className="font-heading text-xl tracking-wide">Past sessions</h3>
          <ul className="space-y-2">
            {data.pastBookings.map((booking) => (
              <FamilyBookingCard key={booking.id} booking={booking} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="font-heading text-xl tracking-wide">Sessions used</h3>
        {data.redemptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No package credits used yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.redemptions.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <p className="font-medium">{item.sessionTitle}</p>
                <p className="text-muted-foreground">
                  {formatSessionDateShort(item.sessionDate)} ·{" "}
                  {formatSessionTime(item.startTime)} · {item.athleteName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.packageName} · Redeemed {formatDate(item.redeemedAt)} ·
                  Confirmation {item.confirmationNumber}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
