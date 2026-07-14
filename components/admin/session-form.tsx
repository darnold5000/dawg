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
    price: initial?.price?.toString() ?? "25",
    payment_requirement: initial?.payment_requirement ?? "pay_at_facility",
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
    featured: false,
  });

  function update(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <form onSubmit={onSubmit} className="space-y-6">
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
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
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
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
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
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
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
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
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
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={form.payment_requirement}
            onChange={(e) => update("payment_requirement", e.target.value)}
          >
            <option value="pay_at_facility">Pay at facility</option>
            <option value="deposit_at_booking">Deposit at booking (Stripe later)</option>
            <option value="full_at_booking">Full at booking (Stripe later)</option>
          </select>
        </div>
        {mode === "create" ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="recurrence">Recurrence</Label>
              <select
                id="recurrence"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={form.recurrence}
                onChange={(e) => update("recurrence", e.target.value)}
              >
                <option value="none">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="weekdays">Every weekday</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recurrence_weeks">Repeat weeks</Label>
              <Input
                id="recurrence_weeks"
                type="number"
                min={1}
                max={26}
                value={form.recurrence_weeks}
                onChange={(e) => update("recurrence_weeks", e.target.value)}
              />
            </div>
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
