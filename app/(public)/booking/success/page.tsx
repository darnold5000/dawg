import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookingSuccessPoller } from "@/components/public/booking-success-client";
import {
  getBookingByCheckoutSessionId,
  getBookingByIdAndToken,
} from "@/lib/billing/booking-lookup";
import { googleCalendarUrl } from "@/lib/calendar";
import { SITE } from "@/lib/constants";
import { formatPrice, formatSessionDate, formatSessionTime } from "@/lib/format";
import { createMetadata } from "@/lib/seo";
import { formatMoney } from "@/lib/billing";

export const metadata = createMetadata({
  title: "Payment successful",
  description: "Your DAWGZ booking payment confirmation.",
  path: "/booking/success",
});

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    booking_id?: string;
    token?: string;
    session_id?: string;
  }>;
}) {
  const q = await searchParams;
  const token = q.token ?? "";
  const checkoutSessionId = q.session_id;

  let booking =
    checkoutSessionId && checkoutSessionId !== "{CHECKOUT_SESSION_ID}"
      ? await getBookingByCheckoutSessionId(checkoutSessionId, token || undefined)
      : null;

  if (!booking && q.booking_id && token) {
    booking = await getBookingByIdAndToken(q.booking_id, token);
  }

  if (!booking || !booking.session || !booking.athlete) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-3xl tracking-wide">Booking not found</h1>
        <p className="mt-3 text-muted-foreground">
          We could not load this confirmation. Check your email or contact DAWGZ.
        </p>
        <Button asChild className="mt-8 bg-brand text-brand-foreground hover:bg-brand/90">
          <Link href="/schedule">Back to schedule</Link>
        </Button>
      </div>
    );
  }

  const confirmed =
    booking.status === "confirmed" && booking.payment_status === "paid";
  const confirming =
    !confirmed &&
    (booking.payment_status === "pending" || booking.status === "pending");

  const athleteName = `${booking.athlete.first_name} ${booking.athlete.last_name}`;
  const amountPaid = booking.amount_paid_cents || booking.amount_due_cents;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand">
        {confirmed ? "Confirmed" : "Payment received"}
      </p>
      <h1 className="mt-2 font-heading text-4xl tracking-wide">
        {confirmed ? "You're booked" : "Finishing your booking"}
      </h1>

      <BookingSuccessPoller confirming={confirming} />

      <dl className="mt-8 space-y-3 rounded-xl border border-border bg-card p-6">
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Confirmation</dt>
          <dd className="font-semibold">{booking.confirmation_number}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Session</dt>
          <dd className="text-right font-medium">{booking.session.title}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">When</dt>
          <dd className="text-right font-medium">
            {formatSessionDate(booking.session.session_date)} ·{" "}
            {formatSessionTime(booking.session.start_time)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Athlete</dt>
          <dd className="font-medium">{athleteName}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Amount paid</dt>
          <dd className="font-medium">
            {confirmed
              ? formatMoney(amountPaid, booking.currency.toUpperCase())
              : formatPrice(booking.amount_due_cents)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Location</dt>
          <dd className="text-right font-medium">
            {booking.session.location_address ?? SITE.address.full}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Link href="/schedule">Browse more sessions</Link>
        </Button>
        {confirmed ? (
          <Button asChild variant="outline">
            <a
              href={googleCalendarUrl({
                title: booking.session.title,
                sessionDate: booking.session.session_date,
                startTime: booking.session.start_time,
                endTime: booking.session.end_time,
                location: booking.session.location_address,
              })}
              target="_blank"
              rel="noopener noreferrer"
            >
              Add to Calendar
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
