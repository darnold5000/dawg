"use client";

import { useMemo, useState } from "react";
import { SessionCard } from "@/components/public/session-card";
import { ScheduleMonthCalendar } from "@/components/public/schedule-month-calendar";
import type { SessionWithRelations } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export function ScheduleBrowser({
  sessions,
}: {
  sessions: SessionWithRelations[];
}) {
  const [view, setView] = useState<"list" | "calendar">("calendar");

  const sorted = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        if (a.session_date !== b.session_date) {
          return a.session_date.localeCompare(b.session_date);
        }
        return a.start_time.localeCompare(b.start_time);
      }),
    [sessions],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        <div className="inline-flex rounded-lg border border-border p-1">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              view === "list"
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground",
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
          {sorted.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <div className="public-light rounded-xl border border-slate-200 p-3 shadow-sm sm:p-4">
          <ScheduleMonthCalendar sessions={sorted} />
        </div>
      )}
    </div>
  );
}
