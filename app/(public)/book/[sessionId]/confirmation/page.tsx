import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSessionById } from "@/lib/data";
import { SITE } from "@/lib/constants";
import {
  formatPrice,
  formatSessionDate,
  formatSessionTime,
} from "@/lib/format";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Booking Confirmation",
  description: "Your DAWG Youth Training reservation confirmation.",
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
  }>;
}) {
  const { sessionId } = await params;
  const q = await searchParams;
  const session = await getSessionById(sessionId);
  if (!session) notFound();

  if (q.waitlist === "1") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">
          Waitlist
        </p>
        <h1 className="mt-2 font-heading text-4xl tracking-wide">
          You're on the list
        </h1>
        <p className="mt-4 text-muted-foreground">
          We'll contact you if a spot opens for {session.title}.
        </p>
        <Button asChild className="mt-8 bg-brand text-brand-foreground hover:bg-brand/90">
          <Link href="/schedule">Back to Schedule</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand">
        Confirmed
      </p>
      <h1 className="mt-2 font-heading text-4xl tracking-wide">
        Reservation complete
      </h1>
      {q.demo === "1" ? (
        <p className="mt-3 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm">
          Demo mode: Supabase is not configured. This confirmation was generated
          locally.
        </p>
      ) : null}
      <dl className="mt-8 space-y-3 rounded-xl border border-border bg-card p-6">
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Confirmation</dt>
          <dd className="font-semibold">{q.confirmation ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Session</dt>
          <dd className="text-right font-medium">{session.title}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">When</dt>
          <dd className="text-right font-medium">
            {formatSessionDate(session.session_date)} ·{" "}
            {formatSessionTime(session.start_time)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Athlete</dt>
          <dd className="font-medium">{q.athlete ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Amount due</dt>
          <dd className="font-medium">
            {formatPrice(session.price)} · Pay at facility
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Location</dt>
          <dd className="text-right font-medium">
            {session.location_address ?? SITE.address.full}
          </dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-muted-foreground">
        A confirmation email will be sent when email delivery is configured.
        Questions? Call{" "}
        <a href={SITE.phoneHref} className="font-medium text-foreground underline">
          {SITE.phone}
        </a>
        .
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Link href="/schedule">Browse more sessions</Link>
        </Button>
        <Button asChild variant="outline">
          <a
            href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(session.title)}&dates=${session.session_date.replace(/-/g, "")}T${session.start_time.replace(/:/g, "").slice(0, 6)}/${session.session_date.replace(/-/g, "")}T${session.end_time.replace(/:/g, "").slice(0, 6)}&details=${encodeURIComponent("DAWG Youth Training")}&location=${encodeURIComponent(session.location_address ?? SITE.address.full)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Add to Calendar
          </a>
        </Button>
      </div>
    </div>
  );
}
