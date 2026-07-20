"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Program, SessionType, Trainer } from "@/lib/types/database";
import { SITE } from "@/lib/constants";

export function SessionForm({
  programs,
  sessionTypes,
  trainers,
  mode = "create",
  sessionId,
  initial,
}: {
  programs: Program[];
  sessionTypes: SessionType[];
  trainers: Trainer[];
  mode?: "create" | "edit";
  sessionId?: string;
  initial?: Partial<{
    title: string;
    program_id: string;
    session_type_id: string;
    trainer_id: string;
    description: string;
    session_date: string;
    start_time: string;
    end_time: string;
    minimum_age: number | null;
    maximum_age: number | null;
    skill_level: string;
    capacity: number;
    price: number;
    payment_requirement: string;
    status: string;
    what_to_bring: string;
    cancellation_policy: string;
  }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    program_id: initial?.program_id ?? "",
    session_type_id: initial?.session_type_id ?? "",
    trainer_id: initial?.trainer_id ?? "",
    description: initial?.description ?? "",
    session_date: initial?.session_date ?? "",
    start_time: initial?.start_time?.slice(0, 5) ?? "16:00",
    end_time: initial?.end_time?.slice(0, 5) ?? "17:00",
    minimum_age: initial?.minimum_age?.toString() ?? "",
    maximum_age: initial?.maximum_age?.toString() ?? "",
    skill_level: initial?.skill_level ?? "",
    capacity: initial?.capacity?.toString() ?? "10",
    // Form stores dollars; API converts to cents
    price: initial?.price != null ? String(initial.price) : "25", // $25 single-session default
    payment_requirement: initial?.payment_requirement ?? "online_or_facility",
    status: initial?.status ?? "published",
    what_to_bring:
      initial?.what_to_bring ??
      "Athletic shoes, water bottle, comfortable training clothes",
    cancellation_policy:
      initial?.cancellation_policy ??
      "Please cancel at least 24 hours in advance when possible.",
    location_name: SITE.name,
    location_address: SITE.address.full,
    recurrence: "none",
    recurrence_weeks: "4",
    recurrence_days: [] as number[],
    featured: false,
  });

  function update(key: string, value: string | boolean | number[]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRecurrenceDay(day: number) {
    setForm((prev) => {
      const selected = prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter((d) => d !== day)
        : [...prev.recurrence_days, day].sort((a, b) => a - b);
      return { ...prev, recurrence_days: selected };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.recurrence === "custom" && form.recurrence_days.length === 0) {
      toast.error("Select at least one day of the week");
      return;
    }
    setLoading(true);
    try {
      const endpoint =
        mode === "edit" && sessionId
          ? `/api/admin/sessions/${sessionId}`
          : "/api/admin/sessions";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          minimum_age: form.minimum_age ? Number(form.minimum_age) : null,
          maximum_age: form.maximum_age ? Number(form.maximum_age) : null,
          capacity: Number(form.capacity),
          price: Number(form.price),
          recurrence_weeks: Number(form.recurrence_weeks),
          program_id: form.program_id || null,
          session_type_id: form.session_type_id || null,
          trainer_id: form.trainer_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      toast.success(mode === "edit" ? "Session updated" : "Session created");
      router.push("/admin/sessions");
      router.refresh();
    } catch {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-panel max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="program_id">Program</Label>
          <select
            id="program_id"
            className="form-select"
            value={form.program_id}
            onChange={(e) => update("program_id", e.target.value)}
          >
            <option value="">None</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="session_type_id">Session type</Label>
          <select
            id="session_type_id"
            className="form-select"
            value={form.session_type_id}
            onChange={(e) => update("session_type_id", e.target.value)}
          >
            <option value="">None</option>
            {sessionTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trainer_id">Trainer</Label>
          <select
            id="trainer_id"
            className="form-select"
            value={form.trainer_id}
            onChange={(e) => update("trainer_id", e.target.value)}
          >
            <option value="">None</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="form-select"
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="session_date">Date</Label>
          <Input
            id="session_date"
            type="date"
            required
            value={form.session_date}
            onChange={(e) => update("session_date", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="start_time">Start time</Label>
          <Input
            id="start_time"
            type="time"
            required
            value={form.start_time}
            onChange={(e) => update("start_time", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_time">End time</Label>
          <Input
            id="end_time"
            type="time"
            required
            value={form.end_time}
            onChange={(e) => update("end_time", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            required
            value={form.capacity}
            onChange={(e) => update("capacity", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            min={0}
            step="0.01"
            required
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minimum_age">Min age</Label>
          <Input
            id="minimum_age"
            type="number"
            value={form.minimum_age}
            onChange={(e) => update("minimum_age", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maximum_age">Max age</Label>
          <Input
            id="maximum_age"
            type="number"
            value={form.maximum_age}
            onChange={(e) => update("maximum_age", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="payment_requirement">Payment</Label>
          <select
            id="payment_requirement"
            className="form-select"
            value={form.payment_requirement}
            onChange={(e) => update("payment_requirement", e.target.value)}
          >
            <option value="online_or_facility">Online or pay at facility</option>
            <option value="pay_online">Pay online (Stripe) only</option>
            <option value="pay_at_facility">Pay at facility only</option>
          </select>
        </div>
        {mode === "create" ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="recurrence">Recurrence</Label>
              <select
                id="recurrence"
                className="form-select"
                value={form.recurrence}
                onChange={(e) => update("recurrence", e.target.value)}
              >
                <option value="none">One-time</option>
                <option value="weekly">Weekly (same weekday)</option>
                <option value="weekdays">Every weekday (Mon–Fri)</option>
                <option value="custom">Custom days</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recurrence_weeks">Schedule length</Label>
              <select
                id="recurrence_weeks"
                className="form-select disabled:opacity-50"
                value={form.recurrence_weeks}
                onChange={(e) => update("recurrence_weeks", e.target.value)}
                disabled={form.recurrence === "none"}
              >
                <option value="1">1 week</option>
                <option value="2">2 weeks</option>
                <option value="4">4 weeks</option>
                <option value="6">6 weeks</option>
                <option value="8">8 weeks</option>
                <option value="12">12 weeks (~3 months)</option>
                <option value="16">16 weeks</option>
                <option value="26">26 weeks (~6 months)</option>
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
                  ].map(({ day, label }) => {
                    const selected = form.recurrence_days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleRecurrenceDay(day)}
                        className={
                          selected
                            ? "rounded-md bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground"
                            : "rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
                        }
                        aria-pressed={selected}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Creates a session on each selected day for the schedule length
                  above, starting from the session date.
                </p>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="what_to_bring">What to bring</Label>
          <Textarea
            id="what_to_bring"
            value={form.what_to_bring}
            onChange={(e) => update("what_to_bring", e.target.value)}
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {loading ? "Saving…" : mode === "edit" ? "Update session" : "Create session"}
      </Button>
    </form>
  );
}
