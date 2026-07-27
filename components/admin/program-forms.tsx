"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { audienceLabelForProgram } from "@/lib/program-grades";
import { isRosterCreditSession } from "@/lib/roster-credit-sessions";
import { slugFromProgramName } from "@/lib/program-slug";
import {
  TRAINING_VISIBILITY_LABELS,
  TRAINING_VISIBILITY_VALUES,
} from "@/lib/training-visibility";
import type { Program } from "@/lib/types/database";

type ProgramFormState = {
  name: string;
  slug: string;
  short_description: string;
  full_description: string;
  minimum_age: string;
  maximum_age: string;
  default_duration_minutes: string;
  default_capacity: string;
  default_price_dollars: string;
  calendar_color: string;
  default_visibility: string;
  image_url: string;
  active: boolean;
  featured: boolean;
  display_order: string;
};

function programToForm(program: Program): ProgramFormState {
  return {
    name: program.name,
    slug: program.slug,
    short_description: program.short_description ?? "",
    full_description: program.full_description ?? "",
    minimum_age:
      program.minimum_age != null ? String(program.minimum_age) : "",
    maximum_age:
      program.maximum_age != null ? String(program.maximum_age) : "",
    default_duration_minutes: String(program.default_duration_minutes ?? 60),
    default_capacity: String(program.default_capacity ?? 10),
    default_price_dollars: String((program.default_price_cents ?? 0) / 100),
    calendar_color: program.calendar_color ?? "",
    default_visibility: program.default_visibility ?? "public",
    image_url: program.image_url ?? "",
    active: program.active,
    featured: program.featured,
    display_order: String(program.display_order ?? 0),
  };
}

function formToPayload(form: ProgramFormState) {
  return {
    name: form.name,
    slug: form.slug.trim() || null,
    short_description: form.short_description || null,
    full_description: form.full_description || null,
    minimum_age: form.minimum_age ? Number(form.minimum_age) : null,
    maximum_age: form.maximum_age ? Number(form.maximum_age) : null,
    default_duration_minutes: Number(form.default_duration_minutes) || 60,
    default_capacity: Number(form.default_capacity) || 10,
    default_price_cents: Math.round(
      Number(form.default_price_dollars || 0) * 100,
    ),
    calendar_color: form.calendar_color.trim() || null,
    default_visibility: form.default_visibility || "public",
    image_url: form.image_url.trim() || null,
    active: form.active,
    featured: form.featured,
    display_order: Number(form.display_order) || 0,
  };
}

function ProgramFields({
  form,
  setForm,
  showSlug,
}: {
  form: ProgramFormState;
  setForm: React.Dispatch<React.SetStateAction<ProgramFormState>>;
  showSlug?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="name">Program name</Label>
        <Input
          id="name"
          required
          value={form.name}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              name: e.target.value,
              slug: showSlug
                ? prev.slug
                : slugFromProgramName(e.target.value),
            }))
          }
        />
      </div>
      {showSlug ? (
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="slug">URL slug</Label>
          <Input
            id="slug"
            value={form.slug}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                slug: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, ""),
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, and hyphens only.
          </p>
        </div>
      ) : null}
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="short_description">Short description</Label>
        <Textarea
          id="short_description"
          value={form.short_description}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, short_description: e.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="full_description">Full description</Label>
        <Textarea
          id="full_description"
          rows={4}
          value={form.full_description}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, full_description: e.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="default_duration_minutes">Default duration (min)</Label>
        <Input
          id="default_duration_minutes"
          type="number"
          min={15}
          max={480}
          value={form.default_duration_minutes}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              default_duration_minutes: e.target.value,
            }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="default_capacity">Default capacity</Label>
        <Input
          id="default_capacity"
          type="number"
          min={1}
          value={form.default_capacity}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, default_capacity: e.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="default_price_dollars">Default price ($)</Label>
        <Input
          id="default_price_dollars"
          type="number"
          min={0}
          step="0.01"
          value={form.default_price_dollars}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              default_price_dollars: e.target.value,
            }))
          }
        />
        <p className="text-xs text-muted-foreground">
          Little / Big Dawgs use package credits at booking ($0 online).
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="calendar_color">Calendar color</Label>
        <Input
          id="calendar_color"
          placeholder="#2563eb"
          value={form.calendar_color}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, calendar_color: e.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="minimum_age">Min age (optional)</Label>
        <Input
          id="minimum_age"
          type="number"
          min={0}
          value={form.minimum_age}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, minimum_age: e.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="maximum_age">Max age (optional)</Label>
        <Input
          id="maximum_age"
          type="number"
          min={0}
          value={form.maximum_age}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, maximum_age: e.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="default_visibility">Default visibility</Label>
        <select
          id="default_visibility"
          className="form-select"
          value={form.default_visibility}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              default_visibility: e.target.value,
            }))
          }
        >
          {TRAINING_VISIBILITY_VALUES.map((v) => (
            <option key={v} value={v}>
              {TRAINING_VISIBILITY_LABELS[v]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="display_order">Display order</Label>
        <Input
          id="display_order"
          type="number"
          value={form.display_order}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, display_order: e.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="image_url">Image path or URL</Label>
        <Input
          id="image_url"
          placeholder="/images/dawg/programs/little-dawgs.png"
          value={form.image_url}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, image_url: e.target.value }))
          }
        />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Checkbox
          id="active"
          checked={form.active}
          onCheckedChange={(checked) =>
            setForm((prev) => ({ ...prev, active: checked === true }))
          }
        />
        <Label htmlFor="active">Active on public site</Label>
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Checkbox
          id="featured"
          checked={form.featured}
          onCheckedChange={(checked) =>
            setForm((prev) => ({ ...prev, featured: checked === true }))
          }
        />
        <Label htmlFor="featured">Featured on home page</Label>
      </div>
    </div>
  );
}

export function ProgramCreateForm({
  embedded = false,
  onSuccess,
}: {
  embedded?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProgramFormState>({
    name: "",
    slug: "",
    short_description: "",
    full_description: "",
    minimum_age: "",
    maximum_age: "",
    default_duration_minutes: "60",
    default_capacity: "10",
    default_price_dollars: "25",
    calendar_color: "#2563eb",
    default_visibility: "public",
    image_url: "",
    active: true,
    featured: false,
    display_order: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(form)),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not add program");
        return;
      }
      toast.success("Program added");
      if (onSuccess) onSuccess();
      else router.refresh();
    } catch {
      toast.error("Could not add program");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        embedded ? "space-y-4" : "space-y-4 rounded-xl border border-border bg-card p-5"
      }
    >
      <ProgramFields form={form} setForm={setForm} />
      <Button
        type="submit"
        disabled={loading}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {loading ? "Saving…" : "Add program"}
      </Button>
    </form>
  );
}

export function ProgramEditCard({ program }: { program: Program }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<ProgramFormState>(() =>
    programToForm(program),
  );

  const roster = isRosterCreditSession({ program });
  const color = program.calendar_color;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/programs/${program.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(form)),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save program");
        return;
      }
      toast.success("Program updated");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Could not save program");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    const msg = roster
      ? "Archive this program? It will be hidden from the site. Calendar sessions stay."
      : "Remove this program? If sessions exist it will be archived instead of deleted.";
    if (!window.confirm(msg)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/programs/${program.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not remove program");
        return;
      }
      toast.success(
        data.archived ? "Program archived" : "Program deleted",
      );
      router.refresh();
    } catch {
      toast.error("Could not remove program");
    } finally {
      setDeleting(false);
    }
  }

  if (!editing) {
    return (
      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {color ? (
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
              ) : null}
              <h3 className="font-heading text-xl tracking-wide">
                {program.name}
              </h3>
              <Badge variant={program.active ? "default" : "secondary"}>
                {program.active ? "Active" : "Hidden"}
              </Badge>
              {program.featured ? (
                <Badge variant="outline">Featured</Badge>
              ) : null}
              {roster ? (
                <Badge variant="outline">Package credit</Badge>
              ) : null}
            </div>
            {program.short_description ? (
              <p className="text-sm text-muted-foreground">
                {program.short_description}
              </p>
            ) : null}
            <p className="text-sm">
              {audienceLabelForProgram(program)} ·{" "}
              {program.default_duration_minutes ?? 60} min · cap{" "}
              {program.default_capacity ?? "—"}
              {!roster && (program.default_price_cents ?? 0) > 0
                ? ` · ${formatPrice(program.default_price_cents ?? 0)}`
                : roster
                  ? " · package credit booking"
                  : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Slug: {program.slug} · order {program.display_order}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Edit program"
              disabled={deleting}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove program"
              className="text-destructive hover:text-destructive"
              disabled={deleting}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-brand/40 bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-heading text-lg tracking-wide">Edit program</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setForm(programToForm(program));
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>
      <ProgramFields form={form} setForm={setForm} showSlug />
      <Button
        type="submit"
        disabled={loading || deleting}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
