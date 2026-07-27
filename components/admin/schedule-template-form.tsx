"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addMonths, format } from "date-fns";
import { toast } from "sonner";
import { AdminTimeSelect } from "@/components/admin/admin-time-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  classCardHeading,
  classCardMeta,
  classTimeLabel,
} from "@/lib/class-display";
import { formatSessionTime } from "@/lib/format";
import { timeToHHMM } from "@/lib/session-time";
import { isUuid } from "@/lib/uuid";
import type { SessionTemplateWithRelations, Trainer } from "@/lib/types/database";
import { effectiveTemplateDefaults } from "@/lib/session-template-defaults";

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

type RepeatPreset =
  | "once"
  | "weekdays"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "custom";

const REPEAT_OPTIONS: { value: RepeatPreset; label: string }[] = [
  { value: "once", label: "One time" },
  { value: "weekdays", label: "Monday–Friday" },
  { value: "monday", label: "Every Monday" },
  { value: "tuesday", label: "Every Tuesday" },
  { value: "wednesday", label: "Every Wednesday" },
  { value: "thursday", label: "Every Thursday" },
  { value: "friday", label: "Every Friday" },
  { value: "custom", label: "Custom days" },
];

function presetToRecurrence(preset: RepeatPreset, customDays: number[]) {
  if (preset === "once") {
    return { mode: "once" as const, recurrence: "none", days: [] };
  }
  if (preset === "weekdays") {
    return { mode: "repeating" as const, recurrence: "weekdays", days: [] };
  }
  if (preset === "custom") {
    return {
      mode: "repeating" as const,
      recurrence: "custom",
      days: customDays,
    };
  }
  const dayMap: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
  };
  return {
    mode: "repeating" as const,
    recurrence: "custom",
    days: [dayMap[preset]],
  };
}

function defaultEndDate(): string {
  return format(addMonths(new Date(), 4), "yyyy-MM-dd");
}

export function ScheduleTemplateForm({
  template,
  trainers = [],
  initialPreset,
}: {
  template: SessionTemplateWithRelations;
  trainers?: Trainer[];
  initialPreset?: "weekdays" | "once";
}) {
  const router = useRouter();
  const effective = effectiveTemplateDefaults(template.program, template);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState({
    repeat_preset: (initialPreset ?? "weekdays") as RepeatPreset,
    session_date: format(new Date(), "yyyy-MM-dd"),
    end_date: defaultEndDate(),
    recurrence_days: [] as number[],
    start_time_override: timeToHHMM(template.default_start_time),
    capacity_override: "",
    trainer_id_override: template.default_trainer_id ?? "",
    notes_override: "",
    skip_duplicates: true,
  });

  const color = template.program?.calendar_color;

  function update(key: string, value: string | boolean | number[]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDay(day: number) {
    setForm((prev) => {
      const selected = prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter((d) => d !== day)
        : [...prev.recurrence_days, day].sort((a, b) => a - b);
      return { ...prev, recurrence_days: selected, repeat_preset: "custom" };
    });
  }

  const schedulePayload = useMemo(() => {
    const { mode, recurrence, days } = presetToRecurrence(
      form.repeat_preset,
      form.recurrence_days,
    );
    return {
      mode,
      session_date: form.session_date,
      recurrence: mode === "once" ? "none" : recurrence,
      recurrence_weeks: 52,
      end_date:
        mode === "repeating" ? form.end_date || null : null,
      recurrence_days: days,
      start_time_override: form.start_time_override || null,
      capacity_override: form.capacity_override
        ? Number(form.capacity_override)
        : null,
      trainer_id_override: isUuid(form.trainer_id_override)
        ? form.trainer_id_override
        : null,
      notes_override: form.notes_override || null,
      status: "published" as const,
      skip_duplicates: form.skip_duplicates,
    };
  }, [form]);

  useEffect(() => {
    if (!form.session_date) return;
    if (form.repeat_preset !== "once" && !form.end_date) return;
    if (
      form.repeat_preset === "custom" &&
      form.recurrence_days.length === 0
    ) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/session-templates/${template.id}/preview`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(schedulePayload),
          },
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setPreview(data.preview);
          setPreviewError(
            data.preview.errors?.length
              ? data.preview.errors.join(" ")
              : null,
          );
        } else {
          setPreview(null);
          setPreviewError(data.error ?? null);
        }
      } catch {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(null);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [template.id, schedulePayload, form.repeat_preset, form.recurrence_days]);

  async function onSchedule() {
    if (!form.session_date) {
      toast.error("Choose a start date");
      return;
    }
    if (form.repeat_preset !== "once" && !form.end_date) {
      toast.error("Choose an end date");
      return;
    }
    if (
      form.repeat_preset === "custom" &&
      form.recurrence_days.length === 0
    ) {
      toast.error("Select at least one day");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/session-templates/${template.id}/schedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(schedulePayload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.preview) setPreview(data.preview);
        toast.error(data.error ?? "Could not add to calendar");
        return;
      }
      toast.success(`${data.count} session(s) added to the calendar`);
      router.push("/admin/sessions");
      router.refresh();
    } catch {
      toast.error("Could not add to calendar");
    } finally {
      setLoading(false);
    }
  }

  const sessionCount = preview?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          {color ? (
            <span
              className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          ) : null}
          <div>
            <p className="font-heading text-lg tracking-wide">
              {classCardHeading(template.program)}
            </p>
            <p className="text-sm text-muted-foreground">
              {classCardMeta(template)}
            </p>
          </div>
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">How often?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {REPEAT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                form.repeat_preset === opt.value
                  ? "border-brand bg-brand/5 ring-1 ring-brand/30"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <input
                type="radio"
                name="repeat_preset"
                className="text-brand"
                checked={form.repeat_preset === opt.value}
                onChange={() => update("repeat_preset", opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      {form.repeat_preset === "custom" ? (
        <div className="space-y-2">
          <Label>Which days?</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { day: 1, label: "Mon" },
              { day: 2, label: "Tue" },
              { day: 3, label: "Wed" },
              { day: 4, label: "Thu" },
              { day: 5, label: "Fri" },
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="session_date">
            {form.repeat_preset === "once" ? "Date" : "Start date"}
          </Label>
          <Input
            id="session_date"
            type="date"
            required
            value={form.session_date}
            onChange={(e) => update("session_date", e.target.value)}
          />
        </div>
        {form.repeat_preset !== "once" ? (
          <div className="space-y-1.5">
            <Label htmlFor="end_date">End date</Label>
            <Input
              id="end_date"
              type="date"
              required
              value={form.end_date}
              onChange={(e) => update("end_date", e.target.value)}
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="capacity_override">Capacity</Label>
          <Input
            id="capacity_override"
            type="number"
            min={1}
            placeholder={String(effective.capacity)}
            value={form.capacity_override}
            onChange={(e) => update("capacity_override", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use class default ({effective.capacity}).
          </p>
        </div>
        {trainers.length > 0 ? (
          <div className="space-y-1.5">
            <Label htmlFor="trainer_id_override">Coach</Label>
            <select
              id="trainer_id_override"
              className="form-select"
              value={form.trainer_id_override}
              onChange={(e) =>
                update("trainer_id_override", e.target.value)
              }
            >
              <option value="">Use class default</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {preview && sessionCount > 0 ? (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm">
          <p className="font-medium">
            {sessionCount} session{sessionCount === 1 ? "" : "s"} ready to add
            {preview.conflicts.length > 0
              ? ` (${preview.conflicts.length} already on calendar — will skip)`
              : ""}
          </p>
        </div>
      ) : null}

      {previewError ? (
        <p className="text-sm text-amber-800">{previewError}</p>
      ) : null}

      {preview && sessionCount === 0 && form.session_date ? (
        <p className="text-sm text-muted-foreground">
          Preview shows 0 new sessions — they may already exist on the schedule,
          or check that the end date is after the start date.
        </p>
      ) : null}

      <div>
        <button
          type="button"
          className="text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "Hide" : "Show"} advanced options
        </button>
      </div>

      {showAdvanced ? (
        <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="start_time_override">Start time override</Label>
            <AdminTimeSelect
              id="start_time_override"
              value={form.start_time_override}
              onChange={(t) => update("start_time_override", t)}
            />
            <p className="text-xs text-muted-foreground">
              Default {classTimeLabel(template)}
            </p>
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
              Skip dates that already have this class at the same time
            </Label>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={loading}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={onSchedule}
        >
          {loading
            ? "Working…"
            : sessionCount > 0
              ? `Create ${sessionCount} session${sessionCount === 1 ? "" : "s"}`
              : "Create sessions"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/classes">Cancel</Link>
        </Button>
      </div>

      {preview && preview.occurrences.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-5 text-sm">
          <p className="font-medium text-muted-foreground">Preview</p>
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-muted-foreground">
            {preview.occurrences.slice(0, 15).map((o) => (
              <li key={`${o.session_date}-${o.start_time}`}>
                {o.session_date} · {formatSessionTime(o.start_time)}
              </li>
            ))}
            {preview.occurrences.length > 15 ? (
              <li>…and {preview.occurrences.length - 15} more</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
