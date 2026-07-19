"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    parentName: "",
    email: "",
    phone: "",
    athleteAge: "",
    message: "",
    company: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName: form.parentName,
          email: form.email,
          phone: form.phone || undefined,
          athleteAge: form.athleteAge || undefined,
          message: form.message,
          company: form.company,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not send message");
        return;
      }
      setSent(true);
      toast.success("Message sent");
      setForm({
        parentName: "",
        email: "",
        phone: "",
        athleteAge: "",
        message: "",
        company: "",
      });
    } catch {
      toast.error("Could not send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950"
        role="status"
      >
        <h2 className="font-heading text-xl tracking-wide">Message sent</h2>
        <p className="mt-2 text-sm">
          Thanks — we received your note and will follow up soon. You can also
          call or book a session from the schedule.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => setSent(false)}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div>
        <h2 className="font-heading text-xl tracking-wide">Send a message</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Questions about training, ages, or availability? We&apos;ll get back
          to you.
        </p>
      </div>

      {/* Honeypot — unusual name + autocomplete off so browsers don't autofill */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <Label htmlFor="website_url_hp">Website</Label>
        <Input
          id="website_url_hp"
          name="website_url_hp"
          tabIndex={-1}
          autoComplete="off"
          value={form.company}
          onChange={(e) => update("company", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="parentName">Parent name</Label>
          <Input
            id="parentName"
            required
            value={form.parentName}
            onChange={(e) => update("parentName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="athleteAge">Athlete age (optional)</Label>
          <Input
            id="athleteAge"
            type="number"
            min={3}
            max={21}
            value={form.athleteAge}
            onChange={(e) => update("athleteAge", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            required
            minLength={5}
            rows={5}
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto sm:px-8"
      >
        {submitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
