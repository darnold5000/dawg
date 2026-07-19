import { notFound } from "next/navigation";
import { BookingForm } from "@/components/public/booking-form";
import { getSessionById } from "@/lib/data";
import { createMetadata } from "@/lib/seo";
import { paymentMethodLabel } from "@/lib/billing/payment-options";

function bookingPaymentBlurb(
  requirement: string | null | undefined,
): string {
  switch (requirement) {
    case "pay_online":
      return "No account required. You’ll pay securely online after confirming.";
    case "online_or_facility":
      return "No account required. Choose pay online or pay at the facility.";
    case "pay_at_facility":
    default:
      return `No account required. ${paymentMethodLabel("pay_at_facility")} for this session.`;
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
        {bookingPaymentBlurb(session.payment_requirement)}
      </p>
      <div className="mt-8">
        <BookingForm session={session} waitlistMode={waitlistMode} />
      </div>
    </div>
  );
}
