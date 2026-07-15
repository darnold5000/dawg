import { notFound } from "next/navigation";
import { BookingForm } from "@/components/public/booking-form";
import { getSessionById } from "@/lib/data";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionById(sessionId);
  return createMetadata({
    title: session ? `Book ${session.title}` : "Book Session",
    description: "Reserve a DAWGZ Youth Training session online.",
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
        No account required. Payment is collected at the facility.
      </p>
      <div className="mt-8">
        <BookingForm session={session} waitlistMode={waitlistMode} />
      </div>
    </div>
  );
}
