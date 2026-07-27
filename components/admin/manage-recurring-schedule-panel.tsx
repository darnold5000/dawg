"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminTimeSelect } from "@/components/admin/admin-time-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatScheduleDateRange } from "@/lib/format";
import { timeToHHMM } from "@/lib/session-time";
import type { RecurringScheduleSummary } from "@/lib/recurring-schedule-manage";

type DialogMode = "extend" | "end" | "replace" | null;

export function ManageRecurringSchedulePanel({
  summaries,
}: {
  summaries: RecurringScheduleSummary[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [active, setActive] = useState<RecurringScheduleSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastDate, setLastDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("16:00");

  function open(mode: DialogMode, row: RecurringScheduleSummary) {
    setActive(row);
    setDialog(mode);
    setLastDate(row.end_date ?? "");
    setNewEndDate(row.end_date ?? "");
    setEffectiveDate(
      row.start_date && row.start_date > new Date().toISOString().slice(0, 10)
        ? row.start_date
        : new Date().toISOString().slice(0, 10),
    );
    setNewStartTime(timeToHHMM(row.start_time));
  }

  function close() {
    setDialog(null);
    setActive(null);
  }

  async function submit() {
    if (!active) return;
    setLoading(true);
    try {
      let url = "";
      let body: Record<string, unknown> = { template_id: active.template_id };

      if (dialog === "end") {
        url = "/api/admin/schedule/manage?action=end";
        body = { ...body, last_date: lastDate };
      } else if (dialog === "extend") {
        url = "/api/admin/schedule/manage?action=extend";
        body = { ...body, new_end_date: newEndDate };
      } else if (dialog === "replace") {
        url = "/api/admin/schedule/manage?action=replace";
        body = {
          ...body,
          effective_date: effectiveDate,
          new_start_time: newStartTime,
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update schedule");
        return;
      }
      if (dialog === "end") {
        toast.success(`${data.cancelled} session(s) removed from schedule`);
      } else if (dialog === "extend") {
        toast.success(`${data.created} session(s) added`);
      } else {
        toast.success(`${data.updated} session(s) updated to new time`);
      }
      close();
      router.refresh();
    } catch {
      toast.error("Could not update schedule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {summaries.map((row) => (
        <article
          key={row.template_id}
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {row.calendar_color ? (
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: row.calendar_color }}
                    aria-hidden
                  />
                ) : null}
                <h3 className="font-heading text-xl tracking-wide">
                  {row.class_name}
                </h3>
                <span className="text-muted-foreground">{row.time_label}</span>
              </div>
              {row.has_schedule ? (
                <div className="text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">
                      Scheduled:
                    </span>{ " "}
                    {row.start_date && row.end_date
                      ? formatScheduleDateRange(row.start_date, row.end_date)
                      : "—"}
                  </p>
                  <p>{row.recurrence_label}</p>
                  <p className="text-xs">
                    {row.session_count} session
                    {row.session_count === 1 ? "" : "s"} on the schedule
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not on the schedule yet.{" "}
                  <Link
                    href={`/admin/classes/${row.template_id}/calendar?preset=weekdays`}
                    className="text-brand underline"
                  >
                    Schedule M–F
                  </Link>
                </p>
              )}
            </div>
            {row.has_schedule ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => open("extend", row)}
                >
                  Extend
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => open("end", row)}
                >
                  End early
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => open("replace", row)}
                >
                  Replace time
                </Button>
              </div>
            ) : null}
          </div>
        </article>
      ))}

      {dialog && active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <h4 className="font-heading text-lg tracking-wide">
              {dialog === "extend"
                ? "Extend schedule"
                : dialog === "end"
                  ? "End schedule early"
                  : "Replace start time"}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {active.class_name} · {active.time_label}
            </p>

            <div className="mt-4 space-y-4">
              {dialog === "end" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="last_date">Last session date</Label>
                  <Input
                    id="last_date"
                    type="date"
                    value={lastDate}
                    onChange={(e) => setLastDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Sessions after this date will be cancelled (bookings on
                    those dates may need follow-up).
                  </p>
                </div>
              ) : null}

              {dialog === "extend" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="new_end_date">New end date</Label>
                  <Input
                    id="new_end_date"
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Adds Monday–Friday sessions through this date (skips
                    duplicates).
                  </p>
                </div>
              ) : null}

              {dialog === "replace" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="effective_date">Starting on</Label>
                    <Input
                      id="effective_date"
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>New start time</Label>
                    <AdminTimeSelect
                      value={newStartTime}
                      onChange={setNewStartTime}
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={loading}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={submit}
              >
                {loading ? "Saving…" : "Confirm"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={close}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
