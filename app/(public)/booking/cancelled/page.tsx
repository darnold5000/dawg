import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookingRetryButton } from "@/components/public/booking-retry-button";
import {
  getBookingByIdAndToken,
  isHoldActive,
} from "@/lib/billing/booking-lookup";
import { expirePendingBooking } from "@/lib/billing/adapter";
import { formatSessionDate, formatSessionTime } from "@/lib/format";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Payment cancelled",
  description: "Online payment was not completed.",
  path: "/booking/cancelled",
});

export default async function BookingCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{
    booking_id?: string;
    token?: string;
  }>;
}) {
  const q = await searchParams;
  const booking =
    q.booking_id && q.token
      ? await getBookingByIdAndToken(q.booking_id, q.token)
      : null;

  const holdActive = booking ? isHoldActive(booking) : false;

  // If hold already expired, mark it so capacity is released even without Stripe webhook
  if (
    booking &&
    booking.status === "pending" &&
    !holdActive &&
    booking.payment_method === "stripe"
  ) {
    await expirePendingBooking({
      bookingId: booking.id,
      reason: "Hold expired after cancelled Checkout",
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Payment not completed
      </p>
      <h1 className="mt-2 font-heading text-4xl tracking-wide">
        Checkout cancelled
      </h1>
      <p className="mt-4 text-muted-foreground">
        Your payment was not completed, so this booking is{" "}
        <strong>not confirmed</strong>.
      </p>

      {booking?.session ? (
        <dl className="mt-8 space-y-3 rounded-xl border border-border bg-card p-6 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Session</dt>
            <dd className="font-medium">{booking.session.title}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">When</dt>
            <dd className="text-right font-medium">
              {formatSessionDate(booking.session.session_date)} ·{" "}
              {formatSessionTime(booking.session.start_time)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Hold</dt>
            <dd className="font-medium">
              {holdActive ? "Still active — you can retry payment" : "Expired"}
            </dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {booking && holdActive ? (
          <BookingRetryButton
            bookingId={booking.id}
            token={booking.confirmation_token}
          />
        ) : (
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/schedule">Return to schedule</Link>
          </Button>
        )}
        {holdActive ? (
          <Button asChild variant="outline">
            <Link href="/schedule">Browse schedule</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
