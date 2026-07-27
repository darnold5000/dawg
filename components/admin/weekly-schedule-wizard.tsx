"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addMonths, format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { classCardHeading, classTimeLabel } from "@/lib/class-display";
import type { SessionTemplateWithRelations } from "@/lib/types/database";

function defaultEndDate(): string {
  return format(addMonths(new Date(), 4), "yyyy-MM-dd");
}

export function WeeklyScheduleWizard({
  classes,
}: {
  classes: SessionTemplateWithRelations[];
}) {
  const router = useRouter();
  const active = classes.filter((c) => c.is_active);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(active.map((c) => c.id)),
  );
  const [session_date, setSessionDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [end_date, setEndDate] = useState(defaultEndDate());

  const payload = useMemo(
    () => ({
      template_ids: [...selected],
      session_date,
      end_date,
      skip_duplicates: true,
    }),
    [selected, session_date, end_date],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onCreate() {
    if (selected.size === 0) {
      toast.error("Select at least one class");
      return;
    }
    if (!session_date || !end_date) {
      toast.error("Choose start and end dates");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/schedule/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create schedule");
        return;
      }
      toast.success(`${data.count} session(s) added to your schedule`);
      router.push("/admin/sessions");
      router.refresh();
    } catch {
      toast.error("Could not create schedule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-xl tracking-wide">
          Create standard weekly schedule
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Monday–Friday for each selected class. Existing sessions at the same
          time are skipped — nothing is overwritten.
        </p>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add classes first under{" "}
          <Link href="/admin/classes" className="text-brand underline">
            Classes
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map((template) => {
            const color = template.program?.calendar_color;
            const checked = selected.has(template.id);
            return (
              <li key={template.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    checked
                      ? "border-brand bg-brand/5 ring-1 ring-brand/30"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(template.id)}
                    className="size-4"
                  />
                  {color ? (
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="font-medium">
                    {classCardHeading(template.program)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {classTimeLabel(template)} ·{" "}
                    {template.default_duration_minutes} min
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium">Monday–Friday</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bulk_start">Start date</Label>
            <Input
              id="bulk_start"
              type="date"
              value={session_date}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk_end">End date</Label>
            <Input
              id="bulk_end"
              type="date"
              value={end_date}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={loading || selected.size === 0}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={onCreate}
        >
          {loading ? "Working…" : "Create schedule"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/sessions">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
