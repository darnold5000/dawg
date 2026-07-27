"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { timeToHHMM } from "@/lib/session-time";
import type { SessionTemplateWithRelations } from "@/lib/types/database";

type Preview = {
  count: number;
  occurrences: { session_date: string; start_time: string; end_time: string }[];
  conflicts: {
    session_date: string;
    start_time: string;
    existing_title: string;
  }[];
  errors: string[];
};

export function ScheduleTemplateForm({
  template,
}: {
  template: SessionTemplateWithRelations;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [form, setForm] = useState({
    mode: "once" as "once" | "repeating",
    session_date: "",
    recurrence: "weekdays",
    recurrence_weeks: "4",
    recurrence_days: [] as number[],
    start_time_override: timeToHHMM(template.default_start_time),
    capacity_override: "",
    notes_override: "",
    skip_duplicates: true,
  });

  function update(key: string, value: string | boolean | number[]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDay(day: number) {
    setForm((prev) => {
      const selected = prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter((d) => d !== day)
        : [...prev.recurrence_days, day].sort((a, b) => a - b);
      return { ...prev, recurrence_days: selected };
    });
  }

  function payload() {
    return {
      mode: form.mode,
      session_date: form.session_date,
      recurrence: form.mode === "once" ? "none" : form.recurrence,
      recurrence_weeks: Number(form.recurrence_weeks),
      recurrence_days: form.recurrence_days,
      start_time_override: form.start_time_override || null,
      capacity_override: form.capacity_override
        ? Number(form.capacity_override)
        : null,
      notes_override: form.notes_override || null,
      status: "published",
      skip_duplicates: form.skip_duplicates,
    };
  }

  async function runPreview() {
    if (!form.session_date) {
      toast.error("Choose a start date");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/session-templates/${template.id}/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload()),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? data.errors?.[0] ?? "Preview failed");
        return;
      }
      setPreview(data.preview);
    } catch {
      toast.error("Preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSchedule() {
    if (!form.session_date) {
      toast.error("Choose a start date");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/session-templates/${template.id}/schedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload()),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.preview) setPreview(data.preview);
        toast.error(data.error ?? "Could not schedule");
        return;
      }
      toast.success(`${data.count} session(s) added to the calendar`);
      router.push("/admin/sessions");
      router.refresh();
    } catch {
      toast.error("Could not schedule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <p className="font-medium">{template.name}</p>
        <p className="text-muted-foreground">
          Default {timeToHHMM(template.default_start_time)} ·{" "}
          {template.default_duration_minutes} min · capacity{" "}
          {template.default_capacity}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Schedule type</Label>
          <select
            className="form-select"
            value={form.mode}
            onChange={(e) =>
              update("mode", e.target.value as "once" | "repeating")
            }
          >
            <option value="once">One date</option>
            <option value="repeating">Repeating</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="session_date">Start date</Label>
          <Input
            id="session_date"
            type="date"
            required
            value={form.session_date}
            onChange={(e) => update("session_date", e.target.value)}
          />
        </div>
        {form.mode === "repeating" ? (
          <>
            <div className="space-y-1.5">
              <Label>Recurrence</Label>
              <select
                className="form-select"
                value={form.recurrence}
                onChange={(e) => update("recurrence", e.target.value)}
              >
                <option value="weekly">Weekly (same weekday)</option>
                <option value="weekdays">Every weekday (Mon–Fri)</option>
                <option value="custom">Custom days</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Schedule length</Label>
              <select
                className="form-select"
                value={form.recurrence_weeks}
                onChange={(e) => update("recurrence_weeks", e.target.value)}
              >
                {[1, 2, 4, 6, 8, 12, 16, 26].map((w) => (
                  <option key={w} value={String(w)}>
                    {w} week{w === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>
            {form.recurrence === "custom" ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>Days of the week</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { day: 0, label: "Sun" },
                    { day: 1, label: "Mon" },
                    { day: 2, label: "Tue" },
                    { day: 3, label: "Wed" },
                    { day: 4, label: "Thu" },
                    { day: 5, label: "Fri" },
                    { day: 6, label: "Sat" },
                  ].map(({ day, label }) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={
                        form.recurrence_days.includes(day)
                          ? "rounded-md bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground"
                          : "rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="start_time_override">Start time</Label>
          <Input
            id="start_time_override"
            type="time"
            value={form.start_time_override}
            onChange={(e) => update("start_time_override", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="capacity_override">Capacity override</Label>
          <Input
            id="capacity_override"
            type="number"
            min={1}
            placeholder={String(template.default_capacity)}
            value={form.capacity_override}
            onChange={(e) => update("capacity_override", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="notes_override">Notes (appended to description)</Label>
          <Textarea
            id="notes_override"
            value={form.notes_override}
            onChange={(e) => update("notes_override", e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            id="skip_duplicates"
            type="checkbox"
            checked={form.skip_duplicates}
            onChange={(e) => update("skip_duplicates", e.target.checked)}
          />
          <Label htmlFor="skip_duplicates">
            Skip dates that already have a session at this time (recommended)
          </Label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={runPreview}
        >
          Preview
        </Button>
        <Button
          type="button"
          disabled={loading}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={onSchedule}
        >
          {loading ? "Working…" : "Add to calendar"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/session-templates">Cancel</Link>
        </Button>
      </div>

      {preview ? (
        <div className="rounded-xl border border-border bg-card p-5 text-sm">
          <p className="font-medium">
            {preview.count} session(s) would be created
            {preview.conflicts.length > 0
              ? ` · ${preview.conflicts.length} conflict(s)`
              : ""}
          </p>
          {preview.errors.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-destructive">
              {preview.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-muted-foreground">
            {preview.occurrences.slice(0, 20).map((o) => (
              <li key={`${o.session_date}-${o.start_time}`}>
                {o.session_date} · {o.start_time.slice(0, 5)}–
                {o.end_time.slice(0, 5)}
              </li>
            ))}
            {preview.occurrences.length > 20 ? (
              <li>…and {preview.occurrences.length - 20} more</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
