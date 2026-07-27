"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  eachDayOfInterval,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionWithRelations } from "@/lib/types/database";
import { bookLoginPath } from "@/lib/family-auth-url";
import { formatSessionTime, formatSessionTitle } from "@/lib/format";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TWO_WEEKS = 14;

function initialWeekStart(sessions: SessionWithRelations[]): Date {
  if (sessions.length === 0) {
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  }
  const first = sessions.reduce((min, s) =>
    s.session_date < min ? s.session_date : min,
  sessions[0].session_date);
  return startOfWeek(parseISO(first), { weekStartsOn: 0 });
}

export function ScheduleMonthCalendar({
  sessions,
}: {
  sessions: SessionWithRelations[];
}) {
  const [weekStart, setWeekStart] = useState(() => initialWeekStart(sessions));

  const byDate = useMemo(() => {
    const map = new Map<string, SessionWithRelations[]>();
    for (const session of sessions) {
      const list = map.get(session.session_date) ?? [];
      list.push(session);
      map.set(session.session_date, list);
    }
    for (const [key, list] of map) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
      map.set(key, list);
    }
    return map;
  }, [sessions]);

  const gridDays = useMemo(() => {
    const end = addDays(weekStart, TWO_WEEKS - 1);
    return eachDayOfInterval({ start: weekStart, end });
  }, [weekStart]);

  const rangeEnd = addDays(weekStart, TWO_WEEKS - 1);
  const rangeLabel =
    format(weekStart, "MMM d") === format(rangeEnd, "MMM d")
      ? format(weekStart, "MMMM d, yyyy")
      : `${format(weekStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl tracking-wide">{rangeLabel}</h2>
          <p className="text-sm text-muted-foreground">Two-week view</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Previous two weeks"
            onClick={() => setWeekStart((d) => addDays(d, -TWO_WEEKS))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))
            }
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Next two weeks"
            onClick={() => setWeekStart((d) => addDays(d, TWO_WEEKS))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-2.5">{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {gridDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const daySessions = byDate.get(dateKey) ?? [];
            const isToday = dateKey === format(new Date(), "yyyy-MM-dd");

            return (
              <div
                key={dateKey}
                className={`min-h-[10rem] border-b border-r border-border p-2 sm:min-h-[11rem] sm:p-2.5 ${
                  isToday ? "bg-brand/5 ring-1 ring-inset ring-brand/40" : "bg-card"
                }`}
              >
                <p
                  className="mb-1.5 text-xs font-semibold tabular-nums text-foreground sm:text-sm"
                >
                  {format(day, "d")}
                </p>
                <ul className="space-y-2">
                  {daySessions.map((session) => {
                    const spots = session.spots_remaining ?? 0;
                    const full = spots <= 0;
                    const capacity = session.capacity;
                    const booked =
                      session.booked_count ??
                      Math.max(0, capacity - spots);
                    const color = session.program?.calendar_color;
                    const title =
                      session.program?.name ??
                      formatSessionTitle(session.title);
                    const availLabel = full
                      ? "Full"
                      : `${spots} avail`;

                    return (
                      <li
                        key={session.id}
                        className="rounded-lg border border-border/80 bg-background px-2 py-2 shadow-sm"
                      >
                        <div className="flex min-w-0 items-start gap-1.5">
                          {color ? (
                            <span
                              className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                              aria-hidden
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold leading-snug text-brand tabular-nums sm:text-sm">
                              {formatSessionTime(session.start_time)}
                              <span className="font-medium text-foreground">
                                {" · "}
                                {title}
                              </span>
                            </p>
                            <div className="mt-1.5 flex items-center justify-between gap-2">
                              <p
                                className="text-[11px] leading-tight text-muted-foreground sm:text-xs"
                                title={
                                  full
                                    ? "Class full"
                                    : `${booked} booked, ${spots} spots available`
                                }
                              >
                                <span className="font-medium text-foreground">
                                  {booked}/{capacity}
                                </span>
                                {" booked · "}
                                <span
                                  className={
                                    full
                                      ? "font-medium text-destructive"
                                      : "font-medium text-foreground"
                                  }
                                >
                                  {availLabel}
                                </span>
                              </p>
                              <Button
                                asChild
                                size="sm"
                                className={`h-7 shrink-0 px-2.5 text-[11px] font-bold sm:text-xs ${
                                  full
                                    ? ""
                                    : "bg-gold text-gold-foreground hover:bg-gold/90"
                                }`}
                                variant={full ? "secondary" : "default"}
                              >
                                <Link href={bookLoginPath(session.id, full)}>
                                  {full ? "Waitlist" : "Book now"}
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Use the arrows to move by two weeks. Tap Book now to sign in and reserve
        a spot.
      </p>
    </div>
  );
}
