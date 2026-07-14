"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown } from "lucide-react";
import { SessionCard } from "@/components/public/session-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { SessionType, SessionWithRelations } from "@/lib/types/database";
import {
  formatSessionDateShort,
  formatSessionTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const AGE_OPTIONS = Array.from({ length: 14 }, (_, i) => String(i + 5));

function SelectField({
  id,
  value,
  onChange,
  className,
  children,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        className={cn(className, "appearance-none pr-10")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gold"
        aria-hidden
      />
    </div>
  );
}

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
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  const sessionDateBounds = useMemo(() => {
    const dates = [...new Set(sessions.map((s) => s.session_date))].sort();
    return {
      min: dates[0],
      max: dates[dates.length - 1],
    };
  }, [sessions]);

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
      input.click();
    }
  }

  const fieldClass =
    "h-10 w-full rounded-lg border border-[#3d4f70] bg-[#0c1220] px-3 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 dark:bg-[#0c1220]";

  return (
    <div className="space-y-6">
      <form
        className="grid items-end gap-4 rounded-xl border border-[#3d4f70] bg-[#1c2538] p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="space-y-1.5">
          <Label htmlFor="type" className="text-foreground/90">
            Session type
          </Label>
          <SelectField
            id="type"
            value={type}
            onChange={setType}
            className={fieldClass}
          >
            <option value="">All types</option>
            {sessionTypes.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="age" className="text-foreground/90">
            Athlete age
          </Label>
          <SelectField
            id="age"
            value={age}
            onChange={setAge}
            className={fieldClass}
          >
            <option value="">Any age</option>
            {AGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date-trigger" className="text-foreground/90">
            Date
          </Label>
          <div className="relative">
            <button
              id="date-trigger"
              type="button"
              className={cn(
                fieldClass,
                "flex items-center justify-between gap-2 text-left",
              )}
              onClick={openDatePicker}
            >
              <span className={date ? "text-foreground" : "text-muted-foreground"}>
                {date ? formatSessionDateShort(date) : "Pick a date"}
              </span>
              <CalendarDays
                className="size-4 shrink-0 text-gold"
                aria-hidden
              />
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              min={sessionDateBounds.min}
              max={sessionDateBounds.max}
              onChange={(e) => setDate(e.target.value)}
              className="pointer-events-none absolute h-0 w-0 opacity-0"
              tabIndex={-1}
              aria-hidden
            />
          </div>
        </div>
        <div className="flex">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-lg border-[#3d4f70] bg-[#0c1220] px-6 text-foreground hover:bg-[#141c2e] lg:w-auto"
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
