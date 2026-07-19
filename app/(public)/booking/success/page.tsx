import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookingSuccessPoller } from "@/components/public/booking-success-client";
import {
  amountDisplay,
  BookingConfirmedView,
  paymentDisplayLabel,
} from "@/components/public/booking-confirmed-view";
import {
  getBookingByCheckoutSessionId,
  getBookingByIdAndToken,
} from "@/lib/billing/booking-lookup";
import { SITE } from "@/lib/constants";
import { createMetadata } from "@/lib/seo";
import {
  createServiceClient,
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
  const supabase = createServiceClient();
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
  const confirming =
    !confirmed &&
    (booking.payment_status === "pending" || booking.status === "pending");

  const athleteName = `${booking.athlete.first_name} ${booking.athlete.last_name}`;
  const amountPaid = booking.amount_paid_cents || booking.amount_due_cents;
  const coachName = await resolveCoachName(booking.session.trainer_id);
  const location =
    booking.session.location_address ??
    booking.session.location_name ??
    SITE.address.full;

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
