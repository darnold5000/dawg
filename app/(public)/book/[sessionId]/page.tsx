import { notFound } from "next/navigation";
import { BookingForm } from "@/components/public/booking-form";
import { getSessionById } from "@/lib/data";
import { requireFamilyWithIntake } from "@/lib/family-auth";
import { isRosterCreditSession } from "@/lib/roster-credit-sessions";
import { createMetadata } from "@/lib/seo";
import { paymentMethodLabel } from "@/lib/billing/payment-options";

function bookingIntro(
  session: NonNullable<Awaited<ReturnType<typeof getSessionById>>>,
): string {
  if (isRosterCreditSession(session)) {
    return "Reserve your athlete's spot on the roster. We'll see you at training.";
  }
  switch (session.payment_requirement) {
    case "pay_online":
      return "Pay securely online with Stripe to hold your spot.";
    case "online_or_facility":
      return "Choose how you'd like to pay for this session.";
    case "pay_at_facility":
    default:
      return `Join the roster and ${paymentMethodLabel("pay_at_facility").toLowerCase()}.`;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionById(sessionId);
  return createMetadata({
    title: session ? `Book ${session.title}` : "Book Session",
    description: "Reserve a DAWG Youth Training session online.",
    path: `/book/${sessionId}`,
  });
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ waitlist?: string }>;
}) {
  const { sessionId } = await params;
  const { waitlist } = await searchParams;
  const returnTo = `/book/${sessionId}${waitlist === "1" ? "?waitlist=1" : ""}`;
  await requireFamilyWithIntake(returnTo);

  const session = await getSessionById(sessionId);
  if (!session) notFound();

  const waitlistMode =
    waitlist === "1" || (session.spots_remaining ?? 0) <= 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-heading text-4xl tracking-wide">
        {waitlistMode ? "Join Waitlist" : "Complete Booking"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {waitlistMode
          ? "We'll contact you if a spot opens."
          : bookingIntro(session)}
      </p>
      <div className="mt-8">
        <BookingForm session={session} waitlistMode={waitlistMode} />
      </div>
    </div>
  );
}
