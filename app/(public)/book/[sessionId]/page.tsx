import Link from "next/link";
import { notFound } from "next/navigation";
import { BookSessionGate } from "@/components/public/book-session-gate";
import { Button } from "@/components/ui/button";
import { getSessionById } from "@/lib/data";
import { isDropInSession } from "@/lib/drop-in-sessions";
import { isRosterCreditSession } from "@/lib/roster-credit-sessions";
import { createMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

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
      return "Pay securely online with Stripe to hold your spot.";
    case "pay_at_facility":
    default:
      return "Pay securely online with Stripe to hold your spot.";
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
    description: `Reserve a ${SITE.name} session online.`,
    path: `/book/${sessionId}`,
    index: false,
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

  if (isDropInSession(session)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 md:py-14">
        <h1 className="font-heading text-3xl tracking-wide sm:text-4xl">
          Just show up
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
          {session.title} is part of the 12-week program. Show up at the
          scheduled time.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/schedule">See the schedule</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/packages">View packages</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 md:py-14 booking-flow">
      <header className="mb-6 sm:mb-8">
        <h1 className="font-heading text-3xl tracking-wide sm:text-4xl">
          {waitlistMode ? "Join Waitlist" : "Complete Booking"}
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
          {waitlistMode
            ? "We'll contact you if a spot opens."
            : bookingIntro(session)}
        </p>
      </header>
      <BookSessionGate session={session} waitlistMode={waitlistMode} />
    </div>
  );
}
