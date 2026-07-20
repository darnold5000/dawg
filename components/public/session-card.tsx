"use client";

import { useState } from "react";
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
import { bookLoginPath } from "@/lib/family-auth-url";

export function SessionCard({ session }: { session: SessionWithRelations }) {
  const [open, setOpen] = useState(false);
  const spots = session.spots_remaining ?? 0;
  const full = spots <= 0;

  const hasExtraDetails = Boolean(
    session.description ||
      session.skill_level ||
      session.location_address ||
      session.location_name ||
      session.what_to_bring ||
      session.cancellation_policy
  );

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {session.session_type?.name ? (
              <Badge variant="secondary">{session.session_type.name}</Badge>
            ) : null}
            {full ? <Badge variant="destructive">Full</Badge> : null}
            {spots > 0 && spots <= 3 ? (
              <Badge className="bg-gold text-gold-foreground hover:bg-gold">
                {spots} spots remaining
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
            {formatPrice(session.price_cents)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {hasExtraDetails ? (
            <Button
              type="button"
              variant="outline"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Hide details" : "Details"}
            </Button>
          ) : null}
          {full ? (
            <Button asChild variant="secondary">
              <Link href={bookLoginPath(session.id, true)}>Join Waitlist</Link>
            </Button>
          ) : (
            <Button
              asChild
              className="bg-gold font-bold text-gold-foreground hover:bg-gold/90"
            >
              <Link href={bookLoginPath(session.id)}>Book</Link>
            </Button>
          )}
        </div>
      </div>

      {open && hasExtraDetails ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
          {session.description ? (
            <p className="text-muted-foreground">{session.description}</p>
          ) : null}
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Spots</dt>
              <dd className="font-medium">
                {full ? "Full" : `${spots} remaining`}
              </dd>
            </div>
            {session.skill_level ? (
              <div>
                <dt className="text-muted-foreground">Skill level</dt>
                <dd className="font-medium">{session.skill_level}</dd>
              </div>
            ) : null}
            {session.location_name || session.location_address ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="font-medium">
                  {[session.location_name, session.location_address]
                    .filter(Boolean)
                    .join(" — ")}
                </dd>
              </div>
            ) : null}
            {session.what_to_bring ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">What to bring</dt>
                <dd className="font-medium">{session.what_to_bring}</dd>
              </div>
            ) : null}
            {session.cancellation_policy ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Cancellation</dt>
                <dd className="font-medium">{session.cancellation_policy}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </article>
  );
}
