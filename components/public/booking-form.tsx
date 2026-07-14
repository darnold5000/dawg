"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SessionWithRelations } from "@/lib/types/database";
import {
  formatPrice,
  formatSessionDate,
  formatSessionTime,
} from "@/lib/format";

export function BookingForm({
  session,
  waitlistMode = false,
}: {
  session: SessionWithRelations;
  waitlistMode?: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    parentFirstName: "",
    parentLastName: "",
    parentEmail: "",
    parentPhone: "",
    athleteFirstName: "",
    athleteLastName: "",
    athleteDob: "",
    primarySport: "",
    experienceLevel: "",
    medicalNotes: "",
    customerNotes: "",
    isGuardian: false,
    acceptCancellation: false,
    acceptWaiver: false,
    acceptTerms: false,
    acceptPrivacy: false,
    mediaConsent: false,
    waitlistParentName: "",
    waitlistAthleteName: "",
    waitlistEmail: "",
    waitlistPhone: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (waitlistMode) {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            parentName: form.waitlistParentName,
            athleteName: form.waitlistAthleteName,
            email: form.waitlistEmail,
            phone: form.waitlistPhone,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Could not join waitlist");
          return;
        }
        toast.success("You're on the waitlist");
        router.push(`/book/${session.id}/confirmation?waitlist=1`);
        return;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          parentFirstName: form.parentFirstName,
          parentLastName: form.parentLastName,
          parentEmail: form.parentEmail,
          parentPhone: form.parentPhone,
          athleteFirstName: form.athleteFirstName,
          athleteLastName: form.athleteLastName,
          athleteDob: form.athleteDob,
          primarySport: form.primarySport || undefined,
          experienceLevel: form.experienceLevel || undefined,
          medicalNotes: form.medicalNotes || undefined,
          customerNotes: form.customerNotes || undefined,
          isGuardian: form.isGuardian || undefined,
          acceptCancellation: form.acceptCancellation || undefined,
          acceptWaiver: form.acceptWaiver || undefined,
          acceptTerms: form.acceptTerms || undefined,
          acceptPrivacy: form.acceptPrivacy || undefined,
          mediaConsent: form.mediaConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Booking failed");
        if (data.code === "SESSION_FULL") {
          router.push(`/book/${session.id}?waitlist=1`);
        }
        return;
      }
      const q = new URLSearchParams({
        confirmation: data.confirmationNumber,
        athlete: `${form.athleteFirstName} ${form.athleteLastName}`,
      });
      if (data.demo) q.set("demo", "1");
      router.push(`/book/${session.id}/confirmation?${q.toString()}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (waitlistMode) {
    return (
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading text-xl tracking-wide">Join Waitlist</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.title} · {formatSessionDate(session.session_date)} ·{" "}
            {formatSessionTime(session.start_time)}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="waitlistParentName">Parent name</Label>
            <Input
              id="waitlistParentName"
              required
              value={form.waitlistParentName}
              onChange={(e) => update("waitlistParentName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="waitlistAthleteName">Athlete name</Label>
            <Input
              id="waitlistAthleteName"
              required
              value={form.waitlistAthleteName}
              onChange={(e) => update("waitlistAthleteName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waitlistEmail">Email</Label>
            <Input
              id="waitlistEmail"
              type="email"
              required
              value={form.waitlistEmail}
              onChange={(e) => update("waitlistEmail", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waitlistPhone">Phone</Label>
            <Input
              id="waitlistPhone"
              type="tel"
              required
              value={form.waitlistPhone}
              onChange={(e) => update("waitlistPhone", e.target.value)}
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto"
        >
          {submitting ? "Submitting…" : "Join Waitlist"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-xl tracking-wide">{session.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatSessionDate(session.session_date)} ·{" "}
          {formatSessionTime(session.start_time)} · {formatPrice(session.price)}{" "}
          · Pay at facility
        </p>
      </div>

      <fieldset className="space-y-4">
        <legend className="font-heading text-lg tracking-wide">
          Parent or Guardian
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="parentFirstName">First name</Label>
            <Input
              id="parentFirstName"
              required
              value={form.parentFirstName}
              onChange={(e) => update("parentFirstName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parentLastName">Last name</Label>
            <Input
              id="parentLastName"
              required
              value={form.parentLastName}
              onChange={(e) => update("parentLastName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parentEmail">Email</Label>
            <Input
              id="parentEmail"
              type="email"
              required
              value={form.parentEmail}
              onChange={(e) => update("parentEmail", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parentPhone">Phone</Label>
            <Input
              id="parentPhone"
              type="tel"
              required
              value={form.parentPhone}
              onChange={(e) => update("parentPhone", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-heading text-lg tracking-wide">Athlete</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="athleteFirstName">First name</Label>
            <Input
              id="athleteFirstName"
              required
              value={form.athleteFirstName}
              onChange={(e) => update("athleteFirstName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="athleteLastName">Last name</Label>
            <Input
              id="athleteLastName"
              required
              value={form.athleteLastName}
              onChange={(e) => update("athleteLastName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="athleteDob">Date of birth</Label>
            <Input
              id="athleteDob"
              type="date"
              required
              value={form.athleteDob}
              onChange={(e) => update("athleteDob", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primarySport">Primary sport</Label>
            <Input
              id="primarySport"
              value={form.primarySport}
              onChange={(e) => update("primarySport", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="experienceLevel">Experience level</Label>
            <Input
              id="experienceLevel"
              placeholder="Beginner, Intermediate…"
              value={form.experienceLevel}
              onChange={(e) => update("experienceLevel", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="medicalNotes">Medical or physical considerations</Label>
            <Textarea
              id="medicalNotes"
              value={form.medicalNotes}
              onChange={(e) => update("medicalNotes", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="customerNotes">Optional notes</Label>
            <Textarea
              id="customerNotes"
              value={form.customerNotes}
              onChange={(e) => update("customerNotes", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-border p-4">
        <legend className="px-1 font-heading text-lg tracking-wide">
          Agreements
        </legend>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.isGuardian}
            onCheckedChange={(v) => update("isGuardian", Boolean(v))}
            required
          />
          <span>
            I am the athlete’s parent or legal guardian (required for minors).
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.acceptCancellation}
            onCheckedChange={(v) => update("acceptCancellation", Boolean(v))}
            required
          />
          <span>I acknowledge the cancellation policy.</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.acceptWaiver}
            onCheckedChange={(v) => update("acceptWaiver", Boolean(v))}
            required
          />
          <span>
            I acknowledge liability waiver language will be provided by DAWG
            (preliminary acknowledgment only).
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.mediaConsent}
            onCheckedChange={(v) => update("mediaConsent", Boolean(v))}
          />
          <span>Photo / media consent (optional).</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.acceptTerms}
            onCheckedChange={(v) => update("acceptTerms", Boolean(v))}
            required
          />
          <span>
            I agree to the{" "}
            <Link href="/booking-policy" className="underline">
              booking policy
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.acceptPrivacy}
            onCheckedChange={(v) => update("acceptPrivacy", Boolean(v))}
            required
          />
          <span>
            I agree to the{" "}
            <Link href="/privacy" className="underline">
              privacy policy
            </Link>
            .
          </span>
        </label>
      </fieldset>

      <Button
        type="submit"
        disabled={submitting}
        className="h-12 w-full bg-brand text-base text-brand-foreground hover:bg-brand/90 sm:w-auto sm:px-8"
      >
        {submitting ? "Reserving…" : "Confirm Reservation"}
      </Button>
    </form>
  );
}
