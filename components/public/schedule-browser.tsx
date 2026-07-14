"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SessionCard } from "@/components/public/session-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SessionType, SessionWithRelations } from "@/lib/types/database";
import {
  formatSessionDateShort,
  formatSessionTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export function ScheduleBrowser({
  sessions,
  sessionTypes,
  initialType,
  initialAge,
  initialDate,
}: {
  sessions: SessionWithRelations[];
  sessionTypes: SessionType[];
  initialType?: string;
  initialAge?: string;
  initialDate?: string;
}) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [type, setType] = useState(initialType ?? "");
  const [age, setAge] = useState(initialAge ?? "");
  const [date, setDate] = useState(initialDate ?? "");

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      if (type && session.session_type?.slug !== type) return false;
      if (date && session.session_date !== date) return false;
      if (age) {
        const n = Number(age);
        if (
          Number.isFinite(n) &&
          ((session.minimum_age != null && n < session.minimum_age) ||
            (session.maximum_age != null && n > session.maximum_age))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [sessions, type, age, date]);

  const byDate = useMemo(() => {
    const map = new Map<string, SessionWithRelations[]>();
    for (const session of filtered) {
      const list = map.get(session.session_date) ?? [];
      list.push(session);
      map.set(session.session_date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="space-y-1.5">
          <Label htmlFor="type">Session type</Label>
          <select
            id="type"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All types</option>
            {sessionTypes.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="age">Athlete age</Label>
          <Input
            id="age"
            type="number"
            min={3}
            max={18}
            placeholder="e.g. 10"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setType("");
              setAge("");
              setDate("");
            }}
          >
            Clear
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length} session{filtered.length === 1 ? "" : "s"}
        </p>
        <div className="inline-flex rounded-lg border border-border p-1">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              view === "list" ? "bg-ink text-primary-foreground" : "text-muted-foreground",
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
                ? "bg-ink text-primary-foreground"
                : "text-muted-foreground",
            )}
            onClick={() => setView("calendar")}
          >
            Calendar
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          No sessions match these filters.
        </p>
      ) : view === "list" ? (
        <div className="grid gap-4">
          {filtered.map((session) => (
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
                {daySessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/schedule/${session.id}`}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-brand"
                  >
                    <p className="text-sm text-brand">
                      {formatSessionTime(session.start_time)}
                    </p>
                    <h3 className="mt-1 font-heading text-lg tracking-wide">
                      {session.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {(session.spots_remaining ?? 0) > 0
                        ? `${session.spots_remaining} spots left`
                        : "Full"}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
