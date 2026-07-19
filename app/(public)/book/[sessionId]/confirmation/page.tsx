import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  amountDisplay,
  BookingConfirmedView,
  paymentDisplayLabel,
} from "@/components/public/booking-confirmed-view";
import { getSessionById } from "@/lib/data";
import { SITE } from "@/lib/constants";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Booking Confirmation",
  description: "Your DAWGZ Youth Training reservation confirmation.",
  path: "/book/confirmation",
});

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{
    confirmation?: string;
    athlete?: string;
    waitlist?: string;
    demo?: string;
    payment?: string;
  }>;
}) {
  const { sessionId } = await params;
  const q = await searchParams;
  const session = await getSessionById(sessionId);
  if (!session) notFound();

  if (q.waitlist === "1") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm font-semibold tracking-widest text-brand uppercase">
          Waitlist
        </p>
        <h1 className="mt-2 font-heading text-4xl tracking-wide">
          You&apos;re on the list
        </h1>
        <p className="mt-4 text-muted-foreground">
          We&apos;ll contact you if a spot opens for {session.title}. Check your
          email for a waitlist confirmation when delivery is configured.
        </p>
        <Button
          asChild
          className="mt-8 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Link href="/schedule">Back to Schedule</Link>
        </Button>
      </div>
    );
  }

  const paymentMethod =
    q.payment === "stripe" ? "stripe" : "pay_at_facility";
  const location =
    session.location_address ??
    session.location_name ??
    SITE.address.full;

  return (
    <BookingConfirmedView
      sessionTitle={session.title}
      sessionDate={session.session_date}
      startTime={session.start_time}
      endTime={session.end_time}
      athleteName={q.athlete ?? "—"}
      coachName={session.trainer?.name}
      location={location}
      paymentLabel={paymentDisplayLabel(paymentMethod)}
      amountLabel={amountDisplay(session.price_cents, paymentMethod)}
      confirmationNumber={q.confirmation ?? "—"}
      demo={q.demo === "1"}
      confidenceMessage={
        q.demo === "1"
          ? "Your reservation is recorded locally for this demo. Connect Resend to email confirmations and calendar invites automatically."
          : "We've emailed your confirmation and calendar invite. You don't need to screenshot this page — check your inbox in a few seconds."
      }
    />
  );
}
