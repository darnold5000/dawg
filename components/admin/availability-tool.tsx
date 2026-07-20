"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePrivateSlots } from "@/lib/sessions-client";
import type { Trainer } from "@/lib/types/database";

export function AvailabilityTool({ trainers }: { trainers: Trainer[] }) {
  const [form, setForm] = useState({
    trainer_id: trainers[0]?.id ?? "",
    date: "",
    startTime: "16:00",
    endTime: "20:00",
    durationMinutes: "60",
    bufferMinutes: "15",
    price: "60",
    minimum_age: "5",
    maximum_age: "18",
    capacity: "1",
  });
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => {
    if (!form.date) return [];
    return generatePrivateSlots({
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      durationMinutes: Number(form.durationMinutes),
      bufferMinutes: Number(form.bufferMinutes),
    });
  }, [form]);

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          durationMinutes: Number(form.durationMinutes),
          bufferMinutes: Number(form.bufferMinutes),
          price: Number(form.price),
          minimum_age: Number(form.minimum_age),
          maximum_age: Number(form.maximum_age),
          capacity: Number(form.capacity),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not generate slots");
        return;
      }
      toast.success(`Created ${data.count ?? 0} private lesson slots`);
    } catch {
      toast.error("Could not generate slots");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={onGenerate} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="trainer_id">Trainer</Label>
          <select
            id="trainer_id"
            className="form-select"
            value={form.trainer_id}
            onChange={(e) => setForm({ ...form, trainer_id: e.target.value })}
          >
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="startTime">Available from</Label>
            <Input
              id="startTime"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endTime">Available until</Label>
            <Input
              id="endTime"
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="durationMinutes">Lesson duration (min)</Label>
            <Input
              id="durationMinutes"
              type="number"
              min={15}
              value={form.durationMinutes}
              onChange={(e) =>
                setForm({ ...form, durationMinutes: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bufferMinutes">Buffer (min)</Label>
            <Input
              id="bufferMinutes"
              type="number"
              min={0}
              value={form.bufferMinutes}
              onChange={(e) =>
                setForm({ ...form, bufferMinutes: e.target.value })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="price">Price (Stripe, $)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Charged when a parent books this private lesson online.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacity">Athletes per slot</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
        >
          {loading ? "Generating…" : "Generate published slots"}
        </Button>
      </form>

      <div>
        <h3 className="font-heading text-xl tracking-wide">Preview</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {preview.length} slots will be created
        </p>
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-border p-4 text-sm">
          {preview.length === 0 ? (
            <li className="text-muted-foreground">Select a date to preview.</li>
          ) : (
            preview.map((slot) => (
              <li key={`${slot.start}-${slot.end}`}>
                {slot.start.slice(0, 5)} – {slot.end.slice(0, 5)}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
