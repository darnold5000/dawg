"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PolicyLinkButton } from "@/components/public/policy-dialog";

const SHIRT_SIZES = ["Small", "Medium", "Large", "XL", "XXL", "3XL"] as const;

export function IntakeForm({ returnTo }: { returnTo?: string }) {
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
    schoolGrade: "",
    heightWeight: "",
    sportPosition: "",
    healthIssues: "",
    emergencyContact1Name: "",
    emergencyContact1Phone: "",
    emergencyContact2Name: "",
    emergencyContact2Phone: "",
    packageInterest: "single" as "single" | "pack-10" | "pack-20",
    shirtSize: "" as string,
    goal: "",
    acceptWaiver: false,
    mediaConsent: false,
    rememberFamily: true,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.acceptWaiver) {
      toast.error("Please accept the liability waiver");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          shirtSize: form.shirtSize || null,
          acceptWaiver: true as const,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save intake");
        return;
      }
      toast.success("Intake saved");
      if (returnTo) {
        router.push(returnTo);
      } else if (form.packageInterest) {
        router.push(`/packages?pack=${form.packageInterest}`);
      } else {
        router.push("/schedule");
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-heading text-xl tracking-wide">DAWG information</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dedicated Addiction Win Greatness — complete this once before your
          first booking.
        </p>
      </div>

      <fieldset className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
        <legend className="px-1 font-heading text-lg tracking-wide">
          Parent / guardian
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="inParentFirst">First name</Label>
          <Input
            id="inParentFirst"
            required
            value={form.parentFirstName}
            onChange={(e) => update("parentFirstName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inParentLast">Last name</Label>
          <Input
            id="inParentLast"
            required
            value={form.parentLastName}
            onChange={(e) => update("parentLastName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inEmail">Email</Label>
          <Input
            id="inEmail"
            type="email"
            required
            value={form.parentEmail}
            onChange={(e) => update("parentEmail", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inPhone">Phone</Label>
          <Input
            id="inPhone"
            type="tel"
            required
            value={form.parentPhone}
            onChange={(e) => update("parentPhone", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
        <legend className="px-1 font-heading text-lg tracking-wide">
          Athlete
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="inAthleteFirst">First name</Label>
          <Input
            id="inAthleteFirst"
            required
            value={form.athleteFirstName}
            onChange={(e) => update("athleteFirstName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inAthleteLast">Last name</Label>
          <Input
            id="inAthleteLast"
            required
            value={form.athleteLastName}
            onChange={(e) => update("athleteLastName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inDob">Date of birth</Label>
          <Input
            id="inDob"
            type="date"
            required
            value={form.athleteDob}
            onChange={(e) => update("athleteDob", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inGrade">School grade / grad year</Label>
          <Input
            id="inGrade"
            value={form.schoolGrade}
            onChange={(e) => update("schoolGrade", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inHw">Height &amp; weight</Label>
          <Input
            id="inHw"
            value={form.heightWeight}
            onChange={(e) => update("heightWeight", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inPos">Position in sports</Label>
          <Input
            id="inPos"
            value={form.sportPosition}
            onChange={(e) => update("sportPosition", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="inHealth">
            Health issues or allergies (if any, please explain)
          </Label>
          <Textarea
            id="inHealth"
            rows={3}
            value={form.healthIssues}
            onChange={(e) => update("healthIssues", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
        <legend className="px-1 font-heading text-lg tracking-wide">
          Emergency contacts
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="inEc1Name">Contact 1 name</Label>
          <Input
            id="inEc1Name"
            required
            value={form.emergencyContact1Name}
            onChange={(e) => update("emergencyContact1Name", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inEc1Phone">Contact 1 phone</Label>
          <Input
            id="inEc1Phone"
            type="tel"
            required
            value={form.emergencyContact1Phone}
            onChange={(e) => update("emergencyContact1Phone", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inEc2Name">Contact 2 name (optional)</Label>
          <Input
            id="inEc2Name"
            value={form.emergencyContact2Name}
            onChange={(e) => update("emergencyContact2Name", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inEc2Phone">Contact 2 phone (optional)</Label>
          <Input
            id="inEc2Phone"
            type="tel"
            value={form.emergencyContact2Phone}
            onChange={(e) => update("emergencyContact2Phone", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-border p-4">
        <legend className="px-1 font-heading text-lg tracking-wide">
          Membership interest
        </legend>
        {(
          [
            ["single", "Single session $25"],
            ["pack-10", "10 sessions $200 ($20/class)"],
            ["pack-20", "20 sessions $300 ($15/class)"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-start gap-3 text-sm">
            <input
              type="radio"
              name="packageInterest"
              className="mt-1"
              checked={form.packageInterest === value}
              onChange={() => update("packageInterest", value)}
              value={value}
            />
            <span>{label}</span>
          </label>
        ))}
        <div className="space-y-1.5 pt-2">
          <Label htmlFor="inShirt">Shirt size</Label>
          <select
            id="inShirt"
            className="form-select"
            value={form.shirtSize}
            onChange={(e) => update("shirtSize", e.target.value)}
          >
            <option value="">Select…</option>
            {SHIRT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inGoal">
            What&apos;s your goal to be a DAWG (dominant) in your sport?
          </Label>
          <Textarea
            id="inGoal"
            rows={3}
            value={form.goal}
            onChange={(e) => update("goal", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-border p-4">
        <legend className="px-1 font-heading text-lg tracking-wide">
          Agreements
        </legend>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.acceptWaiver}
            onCheckedChange={(v) => update("acceptWaiver", Boolean(v))}
            required
          />
          <span>
            I am the athlete’s parent or legal guardian (if under 18) and I
            accept the{" "}
            <PolicyLinkButton docId="waiver">
              liability waiver and release
            </PolicyLinkButton>
            .
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.mediaConsent}
            onCheckedChange={(v) => update("mediaConsent", Boolean(v))}
          />
          <span>
            Photo / media consent (optional).{" "}
            <PolicyLinkButton docId="media">Details</PolicyLinkButton>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.rememberFamily}
            onCheckedChange={(v) => update("rememberFamily", Boolean(v))}
          />
          <span>Remember this family on this device for faster booking</span>
        </label>
      </fieldset>

      <Button
        type="submit"
        disabled={submitting}
        className="h-12 w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto sm:px-8"
      >
        {submitting ? "Saving…" : "Submit intake"}
      </Button>
    </form>
  );
}
