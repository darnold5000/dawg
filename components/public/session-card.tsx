import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionWithRelations } from "@/lib/types/database";
import {
  ageRangeLabel,
  durationMinutes,
  formatPrice,
  formatSessionDateShort,
  formatSessionTime,
} from "@/lib/format";

export function SessionCard({ session }: { session: SessionWithRelations }) {
  const spots = session.spots_remaining ?? 0;
  const full = spots <= 0;

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {session.session_type?.name ? (
            <Badge variant="secondary">{session.session_type.name}</Badge>
          ) : null}
          {full ? <Badge variant="destructive">Full</Badge> : null}
          {(session.spots_remaining ?? 0) > 0 &&
          (session.spots_remaining ?? 0) <= 3 ? (
            <Badge className="bg-brand text-brand-foreground hover:bg-brand">
              {session.spots_remaining} spots remaining
            </Badge>
          ) : null}
        </div>
        <h3 className="font-heading text-xl tracking-wide">{session.title}</h3>
        <p className="text-sm text-muted-foreground">
          {formatSessionDateShort(session.session_date)} ·{" "}
          {formatSessionTime(session.start_time)} ·{" "}
          {durationMinutes(session.start_time, session.end_time)} min
        </p>
        <p className="text-sm text-muted-foreground">
          {ageRangeLabel(session.minimum_age, session.maximum_age)}
          {session.trainer?.name ? ` · ${session.trainer.name}` : ""}
          {" · "}
          {formatPrice(session.price)}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button asChild variant="outline">
          <Link href={`/schedule/${session.id}`}>Details</Link>
        </Button>
        {full ? (
          <Button asChild variant="secondary">
            <Link href={`/book/${session.id}?waitlist=1`}>Join Waitlist</Link>
          </Button>
        ) : (
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href={`/book/${session.id}`}>Book</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
