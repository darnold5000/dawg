import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookingSuccessPoller } from "@/components/public/booking-success-client";
import { BookingRetryButton } from "@/components/public/booking-retry-button";
import {
  amountDisplay,
  BookingConfirmedView,
  paymentDisplayLabel,
} from "@/components/public/booking-confirmed-view";
import {
  getBookingByCheckoutSessionId,
  getBookingByIdAndToken,
} from "@/lib/billing/booking-lookup";
import { reconcileCheckoutSession } from "@/lib/billing/reconcile-checkout";
import { SITE } from "@/lib/constants";
import { formatHoldUntil } from "@/lib/format";
import { createMetadata } from "@/lib/seo";
import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";

export const metadata = createMetadata({
  title: "Payment successful",
  description: "Your DAWG booking payment confirmation.",
  path: "/booking/success",
});

async function resolveCoachName(
  trainerId: string | null | undefined,
): Promise<string | null> {
  if (
    !trainerId ||
    !isSupabaseConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  const supabase = createTrainingServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.trainers)
    .select("name")
    .eq("id", trainerId)
    .maybeSingle();
  return data?.name ?? null;
}

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

  let reconcile:
    | { ok: true; confirmed: boolean; stripePaid: boolean }
    | { ok: false; error: string }
    | null = null;

  // If webhook is delayed/missing, confirm from Stripe before rendering.
  // Opening this URL does not confirm unless Stripe reports payment success.
  if (
    checkoutSessionId &&
    checkoutSessionId !== "{CHECKOUT_SESSION_ID}"
  ) {
    reconcile = await reconcileCheckoutSession({ checkoutSessionId });
  } else if (q.booking_id) {
    reconcile = await reconcileCheckoutSession({ bookingId: q.booking_id });
  }

  let booking =
    checkoutSessionId && checkoutSessionId !== "{CHECKOUT_SESSION_ID}"
      ? await getBookingByCheckoutSessionId(
          checkoutSessionId,
          token || undefined,
        )
      : null;

  if (!booking && q.booking_id && token) {
    booking = await getBookingByIdAndToken(q.booking_id, token);
  }

  if (!booking || !booking.session || !booking.athlete) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-3xl tracking-wide">Booking not found</h1>
        <p className="mt-3 text-muted-foreground">
          We could not load this confirmation. Check your email or contact DAWG.
        </p>
        <Button
          asChild
          className="mt-8 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Link href="/schedule">Back to schedule</Link>
        </Button>
      </div>
    );
  }

  const confirmed =
    booking.status === "confirmed" && booking.payment_status === "paid";
  const stripePaid = reconcile?.ok === true && reconcile.stripePaid;
  const confirming = !confirmed && stripePaid;
  const holdUntil = formatHoldUntil(booking.booking_expires_at);

  const athleteName = `${booking.athlete.first_name} ${booking.athlete.last_name}`;
  const amountPaid = booking.amount_paid_cents || booking.amount_due_cents;
  const coachName = await resolveCoachName(booking.session.trainer_id);
  const location =
    booking.session.location_address ??
    booking.session.location_name ??
    SITE.address.full;

  if (!confirmed && !stripePaid) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Payment not completed
        </p>
        <h1 className="mt-2 font-heading text-4xl tracking-wide">
          Not booked yet
        </h1>
        <p className="mt-4 text-muted-foreground">
          Your spot is being held while you finish payment
          {holdUntil ? ` until ${holdUntil}` : ""}. This session is not booked
          until payment succeeds.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {token ? (
            <BookingRetryButton
              bookingId={booking.id}
              token={token}
              label="Continue payment"
            />
          ) : (
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href="/schedule">Return to schedule</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/my">My account</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <BookingConfirmedView
      title={confirmed ? "You're all set!" : "Payment received"}
      confidenceMessage={
        confirmed
          ? "We've emailed your confirmation and calendar invite. You don't need to screenshot this page — check your inbox in a few seconds."
          : "Your payment was received. We're confirming your booking and will email your confirmation shortly."
      }
      sessionTitle={booking.session.title}
      sessionDate={booking.session.session_date}
      startTime={booking.session.start_time}
      endTime={booking.session.end_time}
      athleteName={athleteName}
      coachName={coachName}
      location={location}
      paymentLabel={paymentDisplayLabel("stripe", { paid: confirmed })}
      amountLabel={amountDisplay(amountPaid, "stripe")}
      confirmationNumber={booking.confirmation_number}
      confirmingSlot={<BookingSuccessPoller confirming={confirming} />}
    />
  );
}
