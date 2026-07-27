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

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
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
                className={`min-h-[5rem] border-b border-r border-border p-1 sm:min-h-[5.5rem] sm:p-1.5 ${
                  !inMonth ? "bg-muted/20" : "bg-card"
                } ${isToday ? "ring-1 ring-inset ring-brand/50" : ""}`}
              >
                <p
                  className={`mb-0.5 text-[10px] font-semibold tabular-nums sm:text-xs ${
                    inMonth ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                </p>
                <ul className="space-y-1">
                  {daySessions.map((session) => {
                    const full = (session.spots_remaining ?? 0) <= 0;
                    const color = session.program?.calendar_color;
                    const label =
                      session.program?.name ??
                      formatSessionTitle(session.title);
                    const spotsLabel = full
                      ? "Full"
                      : `${session.spots_remaining}L`;
                    return (
                      <li
                        key={session.id}
                        className="rounded border border-border/70 bg-background/90 px-1 py-0.5 text-[10px] leading-tight sm:text-[11px]"
                      >
                        <div className="flex min-w-0 items-center gap-1">
                          {color ? (
                            <span
                              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                              aria-hidden
                            />
                          ) : null}
                          <span
                            className="shrink-0 font-semibold tabular-nums text-brand"
                          >
                            {formatSessionTime(session.start_time)}
                          </span>
                          <span className="min-w-0 truncate font-medium text-foreground">
                            {label}
                          </span>
                          <span
                            className="shrink-0 text-muted-foreground"
                            title={
                              full
                                ? "Class full"
                                : `${session.spots_remaining} spots left`
                            }
                          >
                            {spotsLabel}
                          </span>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          className={`mt-0.5 h-5 w-full px-1 text-[10px] font-bold sm:h-6 sm:text-[11px] ${
                            full
                              ? ""
                              : "bg-gold text-gold-foreground hover:bg-gold/90"
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
