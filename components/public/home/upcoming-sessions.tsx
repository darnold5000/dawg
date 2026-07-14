import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/public/session-card";
import type { SessionWithRelations } from "@/lib/types/database";

export function HomeUpcomingSessions({
  sessions,
}: {
  sessions: SessionWithRelations[];
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand">
            Live schedule
          </p>
          <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
            Upcoming Sessions
          </h2>
          <p className="mt-4 text-muted-foreground">
            Browse available classes and private lessons. Spots update when
            bookings are confirmed.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/schedule">View Full Schedule</Link>
        </Button>
      </div>

      <div className="mt-10 grid gap-4">
        {sessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            No upcoming sessions published yet. Check back soon or message DAWG
            on Facebook.
          </p>
        ) : (
          sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))
        )}
      </div>
    </section>
  );
}
