"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { defaultDawgTrainerId } from "@/lib/content/coach-avery";
import { isUuid } from "@/lib/uuid";
import { SITE } from "@/lib/constants";
import {
  templateDefaultsFromProgram,
} from "@/lib/session-template-defaults";
import { endTimeFromStart, timeToHHMM } from "@/lib/session-time";
import type {
  Program,
  SessionTemplateWithRelations,
  SessionType,
  Trainer,
} from "@/lib/types/database";
import { isRosterCreditSession } from "@/lib/roster-credit-sessions";
import {
  TRAINING_VISIBILITY_LABELS,
  TRAINING_VISIBILITY_VALUES,
} from "@/lib/training-visibility";

export function SessionTemplateForm({
  programs,
  sessionTypes,
  trainers,
  mode = "create",
  templateId,
  initial,
}: {
  programs: Program[];
  sessionTypes: SessionType[];
  trainers: Trainer[];
  mode?: "create" | "edit";
  templateId?: string;
  initial?: SessionTemplateWithRelations;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const defaultProgram = programs.find((p) => p.id === initial?.program_id);
  const programDefaults = templateDefaultsFromProgram(defaultProgram);

  const catalogPrograms = useMemo(
    () => programs.filter((p) => isUuid(p.id)),
    [programs],
  );
  const catalogSessionTypes = useMemo(
    () => sessionTypes.filter((t) => isUuid(t.id)),
    [sessionTypes],
  );
  const catalogTrainers = useMemo(
    () => trainers.filter((t) => isUuid(t.id)),
    [trainers],
  );

  const groupSessionTypeId =
    catalogSessionTypes.find((t) => t.slug === "group-class")?.id ?? "";

  const defaultProgramId =
    mode === "create"
      ? (catalogPrograms.find((p) => p.slug === "little-dawgs")?.id ??
        catalogPrograms[0]?.id ??
        "")
      : "";

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    program_id:
      initial?.program_id && isUuid(initial.program_id)
        ? initial.program_id
        : defaultProgramId,
    description: initial?.description ?? "",
    default_start_time: timeToHHMM(
      initial?.default_start_time ?? "16:00:00",
    ),
    default_duration_minutes: String(
      initial?.default_duration_minutes ??
        SITE.defaultSessionDurationMinutes,
    ),
    default_capacity: String(
      initial?.default_capacity ?? programDefaults.default_capacity,
    ),
    default_price_dollars: String(
      (initial?.default_price_cents ?? programDefaults.default_price_cents) /
        100,
    ),
    default_trainer_id:
      initial?.default_trainer_id && isUuid(initial.default_trainer_id)
        ? initial.default_trainer_id
        : mode === "create"
          ? defaultDawgTrainerId(catalogTrainers)
          : "",
    default_assistant_trainer_id: initial?.default_assistant_trainer_id ?? "",
    default_session_type_id:
      initial?.default_session_type_id &&
      isUuid(initial.default_session_type_id)
        ? initial.default_session_type_id
        : groupSessionTypeId,
    default_visibility: initial?.default_visibility ?? "",
    use_program_capacity: initial?.default_capacity == null,
    use_program_price: initial?.default_price_cents == null,
    is_active: initial?.is_active ?? true,
  });

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === form.program_id),
    [programs, form.program_id],
  );
  const rosterCredit = isRosterCreditSession({ program: selectedProgram });

  function update(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onProgramChange(programId: string) {
    const program = programs.find((p) => p.id === programId);
    const defaults = templateDefaultsFromProgram(program);
    setForm((prev) => ({
      ...prev,
      program_id: programId,
      default_duration_minutes: String(
        program?.default_duration_minutes ??
          SITE.defaultSessionDurationMinutes,
      ),
      default_capacity: String(defaults.default_capacity),
      default_price_dollars: String(defaults.default_price_cents / 100),
      use_program_capacity: true,
      use_program_price: true,
      default_visibility: "",
    }));
  }

  function formatTimeLabel(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isUuid(form.program_id)) {
      toast.error(
        "Select a program from the live catalog (check Supabase connection).",
      );
      return;
    }
    setLoading(true);
    try {
      const url =
        mode === "edit" && templateId
          ? `/api/admin/session-templates/${templateId}`
          : "/api/admin/session-templates";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          program_id: isUuid(form.program_id) ? form.program_id : null,
          description: form.description || null,
          default_start_time: form.default_start_time,
          default_duration_minutes: Number(form.default_duration_minutes),
          default_capacity: form.use_program_capacity
            ? null
            : Number(form.default_capacity),
          default_price_cents: rosterCredit
            ? null
            : form.use_program_price
              ? null
              : Math.round(Number(form.default_price_dollars) * 100),
          default_trainer_id: isUuid(form.default_trainer_id)
            ? form.default_trainer_id
            : null,
          default_assistant_trainer_id: isUuid(
            form.default_assistant_trainer_id,
          )
            ? form.default_assistant_trainer_id
            : null,
          default_session_type_id: isUuid(form.default_session_type_id)
            ? form.default_session_type_id
            : null,
          default_visibility: form.default_visibility || null,
          is_active: form.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save template");
        return;
      }
      toast.success(mode === "edit" ? "Template updated" : "Template created");
      router.push("/admin/session-templates");
      router.refresh();
    } catch {
      toast.error("Could not save template");
    } finally {
      setLoading(false);
    }
  }

  const endPreview = endTimeFromStart(
    form.default_start_time,
    Number(form.default_duration_minutes) || 60,
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {catalogPrograms.length === 0 ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-950">
          Programs are not loading from the database. Templates cannot be saved
          until Supabase is connected and programs exist for this tenant.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Template name</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="4:00 PM"
          />
          <p className="text-xs text-muted-foreground">
            Program name (e.g. Little Dawgs) comes from the program — use a
            short label like a time slot.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="program_id">Program</Label>
          <select
            id="program_id"
            className="form-select"
            required
            value={form.program_id}
            onChange={(e) => onProgramChange(e.target.value)}
          >
            <option value="">Select program</option>
            {catalogPrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {selectedProgram?.calendar_color ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: selectedProgram.calendar_color }}
              />
              Calendar color from program
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="default_session_type_id">Session type</Label>
          <select
            id="default_session_type_id"
            className="form-select"
            value={form.default_session_type_id}
            onChange={(e) => update("default_session_type_id", e.target.value)}
          >
            <option value="">Default (group class)</option>
            {catalogSessionTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="default_start_time">Default start time</Label>
          <Input
            id="default_start_time"
            type="time"
            required
            value={form.default_start_time}
            onChange={(e) => {
              const t = e.target.value;
              setForm((prev) => ({
                ...prev,
                default_start_time: t,
                name:
                  prev.name.trim() === "" ||
                  /^\d{1,2}:\d{2}/.test(prev.name)
                    ? formatTimeLabel(t)
                    : prev.name,
              }));
            }}
          />
          <p className="text-xs text-muted-foreground">
            Ends {endPreview} ({form.default_duration_minutes} min)
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="default_duration_minutes">Duration (minutes)</Label>
          <Input
            id="default_duration_minutes"
            type="number"
            min={15}
            max={480}
            required
            value={form.default_duration_minutes}
            onChange={(e) => update("default_duration_minutes", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="default_capacity">Capacity override</Label>
          <label className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={form.use_program_capacity}
              onChange={(e) =>
                update("use_program_capacity", e.target.checked)
              }
            />
            Use program default (
            {selectedProgram?.default_capacity ?? programDefaults.default_capacity}
            )
          </label>
          <Input
            id="default_capacity"
            type="number"
            min={1}
            disabled={form.use_program_capacity}
            value={form.default_capacity}
            onChange={(e) => update("default_capacity", e.target.value)}
          />
        </div>
        {!rosterCredit ? (
          <div className="space-y-1.5">
            <Label htmlFor="default_price_dollars">Price override ($)</Label>
            <label className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={form.use_program_price}
                onChange={(e) => update("use_program_price", e.target.checked)}
              />
              Use program default
            </label>
            <Input
              id="default_price_dollars"
              type="number"
              min={0}
              step="0.01"
              disabled={form.use_program_price}
              value={form.default_price_dollars}
              onChange={(e) => update("default_price_dollars", e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Default price</Label>
            <p className="text-sm text-muted-foreground">
              Package credit roster — $0 at booking
            </p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="default_trainer_id">Primary coach</Label>
          <select
            id="default_trainer_id"
            className="form-select"
            value={form.default_trainer_id}
            onChange={(e) => update("default_trainer_id", e.target.value)}
          >
            <option value="">Unassigned</option>
            {catalogTrainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="default_assistant_trainer_id">Assistant coach</Label>
          <select
            id="default_assistant_trainer_id"
            className="form-select"
            value={form.default_assistant_trainer_id}
            onChange={(e) =>
              update("default_assistant_trainer_id", e.target.value)
            }
          >
            <option value="">None</option>
            {catalogTrainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Stored for future calendar UI — not shown on public booking yet.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="default_visibility">Default visibility</Label>
          <select
            id="default_visibility"
            className="form-select"
            value={form.default_visibility}
            onChange={(e) => update("default_visibility", e.target.value)}
          >
            <option value="">Use program default</option>
            {TRAINING_VISIBILITY_VALUES.map((v) => (
              <option key={v} value={v}>
                {TRAINING_VISIBILITY_LABELS[v]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        {mode === "edit" ? (
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update("is_active", e.target.checked)}
            />
            <Label htmlFor="is_active">Active (uncheck to archive)</Label>
          </div>
        ) : null}
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {loading ? "Saving…" : mode === "edit" ? "Update template" : "Create template"}
      </Button>
    </form>
  );
}
