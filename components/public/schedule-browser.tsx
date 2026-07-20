"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SessionCard } from "@/components/public/session-card";
import { Button } from "@/components/ui/button";
import type { SessionWithRelations } from "@/lib/types/database";
import { bookLoginPath } from "@/lib/family-auth-url";
import {
  formatSessionDateShort,
  formatSessionTime,
  formatSessionTitle,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export function ScheduleBrowser({
  sessions,
}: {
  sessions: SessionWithRelations[];
}) {
  const [view, setView] = useState<"list" | "calendar">("calendar");

  const byDate = useMemo(() => {
    const map = new Map<string, SessionWithRelations[]>();
    for (const session of sessions) {
      const list = map.get(session.session_date) ?? [];
      list.push(session);
      map.set(session.session_date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sessions.length} session{sessions.length === 1 ? "" : "s"}
        </p>
        <div className="inline-flex rounded-lg border border-border p-1">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              view === "list" ? "bg-brand text-brand-foreground" : "text-muted-foreground",
            )}
            onClick={() => setView("list")}
          >
            List
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              view === "calendar"
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground",
            )}
            onClick={() => setView("calendar")}
          >
            Calendar
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          No upcoming sessions. Check back soon or contact DAWG for availability.
        </p>
      ) : view === "list" ? (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <div className="grid gap-6">
          {byDate.map(([day, daySessions]) => (
            <section key={day}>
              <h2 className="mb-3 font-heading text-xl tracking-wide">
                {formatSessionDateShort(day)}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {daySessions.map((session) => {
                  const full = (session.spots_remaining ?? 0) <= 0;
                  return (
                    <div
                      key={session.id}
                      className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm"
                    >
                      <p className="text-sm text-brand">
                        {formatSessionTime(session.start_time)}
                      </p>
                      <h3 className="mt-1 font-heading text-lg tracking-wide">
                        {formatSessionTitle(session.title)}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {full
                          ? "Full"
                          : `${session.spots_remaining} spots left`}
                      </p>
                      <div className="mt-3">
                        <Button
                          asChild
                          size="sm"
                          className={
                            full
                              ? undefined
                              : "bg-gold font-bold text-gold-foreground hover:bg-gold/90"
                          }
                          variant={full ? "secondary" : "default"}
                        >
                          <Link
                            href={bookLoginPath(session.id, full)}
                          >
                            {full ? "Waitlist" : "Book"}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
