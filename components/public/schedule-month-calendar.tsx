"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionWithRelations } from "@/lib/types/database";
import { bookLoginPath } from "@/lib/family-auth-url";
import { formatSessionTime, formatSessionTitle } from "@/lib/format";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ScheduleMonthCalendar({
  sessions,
}: {
  sessions: SessionWithRelations[];
}) {
  const initialMonth = useMemo(() => {
    if (sessions.length === 0) return startOfMonth(new Date());
    const first = sessions.reduce((min, s) =>
      s.session_date < min ? s.session_date : min,
    sessions[0].session_date);
    return startOfMonth(parseISO(first));
  }, [sessions]);

  const [month, setMonth] = useState(initialMonth);

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
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl tracking-wide">
          {format(month, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Previous month"
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Next month"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-2">{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {gridDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, month);
            const daySessions = byDate.get(dateKey) ?? [];
            const isToday =
              dateKey === format(new Date(), "yyyy-MM-dd");

            return (
              <div
                key={dateKey}
                className={`min-h-[7.5rem] border-b border-r border-border p-1.5 sm:min-h-[9rem] sm:p-2 ${
                  !inMonth ? "bg-muted/20" : "bg-card"
                } ${isToday ? "ring-1 ring-inset ring-brand/50" : ""}`}
              >
                <p
                  className={`mb-1 text-xs font-semibold tabular-nums ${
                    inMonth ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                </p>
                <ul className="space-y-1.5">
                  {daySessions.map((session) => {
                    const full = (session.spots_remaining ?? 0) <= 0;
                    const color = session.program?.calendar_color;
                    const label =
                      session.program?.name ??
                      formatSessionTitle(session.title);
                    return (
                      <li
                        key={session.id}
                        className="rounded-md border border-border/80 bg-background/80 p-1.5 text-[11px] leading-tight sm:text-xs"
                      >
                        <div className="flex items-start gap-1">
                          {color ? (
                            <span
                              className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                              aria-hidden
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium tabular-nums text-brand">
                              {formatSessionTime(session.start_time)}
                            </p>
                            <p className="truncate font-medium text-foreground">
                              {label}
                            </p>
                            <p className="text-muted-foreground">
                              {full
                                ? "Full"
                                : `${session.spots_remaining} left`}
                            </p>
                          </div>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          className={`mt-1.5 h-7 w-full px-2 text-[11px] sm:text-xs ${
                            full
                              ? ""
                              : "bg-gold font-bold text-gold-foreground hover:bg-gold/90"
                          }`}
                          variant={full ? "secondary" : "default"}
                        >
                          <Link href={bookLoginPath(session.id, full)}>
                            {full ? "Waitlist" : "Book"}
                          </Link>
                        </Button>
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
        Tap Book to sign in and reserve a spot. Full classes offer waitlist.
      </p>
    </div>
  );
}
