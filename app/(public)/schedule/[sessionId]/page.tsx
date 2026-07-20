import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSessionById } from "@/lib/data";
import { createMetadata } from "@/lib/seo";
import { bookLoginPath } from "@/lib/family-auth-url";
import {
  ageRangeLabel,
  durationMinutes,
  formatPrice,
  formatSessionDate,
  formatSessionTime,
} from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionById(sessionId);
  if (!session)
    return createMetadata({
      title: "Session",
      description: "Training session details at DAWG Youth Training.",
      path: `/schedule/${sessionId}`,
    });
  return createMetadata({
    title: session.title,
    description: session.description ?? `Book ${session.title} at DAWG Youth Training.`,
    path: `/schedule/${sessionId}`,
  });
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionById(sessionId);
  if (!session) notFound();

  const full = (session.spots_remaining ?? 0) <= 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand">
        {session.session_type?.name ?? "Session"}
      </p>
      <h1 className="mt-2 font-heading text-4xl tracking-wide">{session.title}</h1>
      {session.description ? (
        <p className="mt-4 text-muted-foreground">{session.description}</p>
      ) : null}

      <dl className="mt-8 grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">Date</dt>
          <dd className="font-medium">{formatSessionDate(session.session_date)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Time</dt>
          <dd className="font-medium">
            {formatSessionTime(session.start_time)} ·{" "}
            {durationMinutes(session.start_time, session.end_time)} min
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Ages</dt>
          <dd className="font-medium">
            {ageRangeLabel(session.minimum_age, session.maximum_age)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Trainer</dt>
          <dd className="font-medium">{session.trainer?.name ?? "DAWG staff"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Price</dt>
          <dd className="font-medium">{formatPrice(session.price_cents)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Spots</dt>
          <dd className="font-medium">
            {full ? "Full" : `${session.spots_remaining} remaining`}
          </dd>
        </div>
        {session.skill_level ? (
          <div>
            <dt className="text-sm text-muted-foreground">Skill level</dt>
            <dd className="font-medium">{session.skill_level}</dd>
          </div>
        ) : null}
        {session.location_address ? (
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Location</dt>
            <dd className="font-medium">{session.location_address}</dd>
          </div>
        ) : null}
        {session.what_to_bring ? (
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">What to bring</dt>
            <dd className="font-medium">{session.what_to_bring}</dd>
          </div>
        ) : null}
        {session.cancellation_policy ? (
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Cancellation policy</dt>
            <dd className="font-medium">{session.cancellation_policy}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        {full ? (
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href={bookLoginPath(session.id, true)}>Join Waitlist</Link>
          </Button>
        ) : (
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href={bookLoginPath(session.id)}>Book This Session</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/schedule">Back to Schedule</Link>
        </Button>
      </div>
    </div>
  );
}
