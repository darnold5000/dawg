"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  addDays,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, List, Pencil, Plus } from "lucide-react";
import { DeleteSessionButton } from "@/components/admin/delete-session-button";
import { Button } from "@/components/ui/button";
import {
  formatScheduleDaySubdate,
  formatScheduleWeekday,
  formatSessionTime,
} from "@/lib/format";

export type ScheduleSessionItem = {
  id: string;
  session_date: string;
  start_time: string;
  title: string;
  program_name: string | null;
  calendar_color: string | null;
  capacity: number;
  booked_count: number;
  trainer_name: string | null;
};

type ViewMode = "list" | "calendar";

export function ScheduleSessionsView({
  sessions,
  today,
  displayDayLimit = 14,
}: {
  sessions: ScheduleSessionItem[];
  today: string;
  displayDayLimit?: number;
}) {
  const [view, setView] = useState<ViewMode>("list");
  const [weekOffset, setWeekOffset] = useState(0);

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleSessionItem[]>();
    for (const s of sessions) {
      const list = map.get(s.session_date) ?? [];
      list.push(s);
      map.set(s.session_date, list);
    }
    for (const [key, list] of map) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
      map.set(key, list);
    }
    return map;
  }, [sessions]);

  const listDates = [...byDate.keys()].slice(0, displayDayLimit);

  const weekStart = useMemo(() => {
    const base = startOfWeek(parseISO(today), { weekStartsOn: 0 });
    return addDays(base, weekOffset * 7);
  }, [today, weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd")),
    [weekStart],
  );

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "list"
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setView("list")}
          >
            <List className="size-4" />
            List
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "calendar"
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="size-4" />
            Week
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/sessions/add">
              <Plus className="mr-1 size-4" />
              Add class
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/programs#private-lessons">Private lesson</Link>
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-6">
          {listDates.map((dateKey) => {
            const daySessions = byDate.get(dateKey) ?? [];
            const isToday = dateKey === today;
            return (
              <section key={dateKey} className="space-y-3">
                <div>
                  <h3 className="font-heading text-lg tracking-widest">
                    {formatScheduleWeekday(dateKey)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatScheduleDaySubdate(dateKey)}
                    {isToday ? " · Today" : ""}
                  </p>
                </div>
                <div className="grid gap-2">
                  {daySessions.map((session) => (
                    <SessionRow key={session.id} session={session} />
                  ))}
                </div>
              </section>
            );
          })}
          {byDate.size > listDates.length ? (
            <p className="text-sm text-muted-foreground">
              Showing the next {listDates.length} days with sessions.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              Week of {format(weekStart, "MMM d, yyyy")}
            </p>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="size-9 shrink-0 border-border bg-background text-foreground shadow-sm hover:bg-muted"
                aria-label="Previous week"
                onClick={() => setWeekOffset((w) => w - 1)}
              >
                <ChevronLeft className="size-5 stroke-[2.5]" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={
                  weekOffset === 0
                    ? "bg-brand/15 text-foreground"
                    : "bg-background shadow-sm"
                }
                disabled={weekOffset === 0}
                onClick={() => setWeekOffset(0)}
              >
                This week
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="size-9 shrink-0 border-border bg-background text-foreground shadow-sm hover:bg-muted"
                aria-label="Next week"
                onClick={() => setWeekOffset((w) => w + 1)}
              >
                <ChevronRight className="size-5 stroke-[2.5]" />
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-7">
            {weekDays.map((dateKey) => {
              const daySessions = byDate.get(dateKey) ?? [];
              const isToday = dateKey === today;
              return (
                <div
                  key={dateKey}
                  className={`min-h-[8rem] rounded-lg border border-border bg-card p-2 ${
                    isToday ? "ring-1 ring-brand/40" : ""
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {formatScheduleWeekday(dateKey).slice(0, 3)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(dateKey), "MMM d")}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {daySessions.length === 0 ? (
                      <li className="text-xs text-muted-foreground">—</li>
                    ) : (
                      daySessions.map((session) => (
                        <li
                          key={session.id}
                          className="rounded-md border border-border bg-muted/30 p-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              {session.calendar_color ? (
                                <span
                                  className="mb-1 inline-block h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: session.calendar_color,
                                  }}
                                  aria-hidden
                                />
                              ) : null}
                              <p className="font-medium tabular-nums">
                                {formatSessionTime(session.start_time)}
                              </p>
                              <p className="truncate font-medium">
                                {session.program_name ?? session.title}
                              </p>
                              <p className="text-muted-foreground">
                                {session.booked_count}/{session.capacity}
                              </p>
                            </div>
                            <SessionCardActions session={session} />
                          </div>
                          <Link
                            href={`/admin/sessions/${session.id}/roster`}
                            className="mt-1 text-brand underline-offset-2 hover:underline"
                          >
                            Roster
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCardActions({ session }: { session: ScheduleSessionItem }) {
  const name = session.program_name ?? session.title;
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        asChild
        variant="ghost"
        size="icon-sm"
        className="size-7 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      >
        <Link
          href={`/admin/sessions/${session.id}/edit`}
          aria-label={`Edit ${name}`}
        >
          <Pencil className="size-3.5" />
        </Link>
      </Button>
      <DeleteSessionButton
        sessionId={session.id}
        title={name}
        bookedCount={session.booked_count}
        iconOnly
      />
    </div>
  );
}

function SessionRow({ session }: { session: ScheduleSessionItem }) {
  const name = session.program_name ?? session.title;
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {session.calendar_color ? (
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: session.calendar_color }}
              aria-hidden
            />
          ) : null}
          <span className="font-medium tabular-nums">
            {formatSessionTime(session.start_time)}
          </span>
          <span className="font-heading tracking-wide">{name}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {session.booked_count}/{session.capacity} booked
          {session.trainer_name ? ` · ${session.trainer_name}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <SessionCardActions session={session} />
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/sessions/${session.id}/roster`}>Roster</Link>
        </Button>
      </div>
    </div>
  );
}
