"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PolicyLinkButton } from "@/components/public/policy-dialog";
import { loginPath } from "@/lib/family-auth-url";

const SHIRT_SIZES = ["Small", "Medium", "Large", "XL", "XXL", "3XL"] as const;

export function FamilyRegisterForm({ returnTo }: { returnTo: string }) {
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
    shirtSize: "",
    goal: "",
    acceptWaiver: false,
    mediaConsent: false,
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
      const res = await fetch("/api/my/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          shirtSize: form.shirtSize || null,
          acceptWaiver: true as const,
          returnTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create account");
        return;
      }
      toast.success("Account created");
      router.push(data.redirectTo ?? returnTo);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={loginPath(returnTo)}
          className="font-medium text-foreground underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>

      <fieldset className="form-fieldset grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 px-1 font-heading text-lg tracking-wide sm:col-span-2">
          Parent / guardian
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="regParentFirst">First name</Label>
          <Input
            id="regParentFirst"
            required
            value={form.parentFirstName}
            onChange={(e) => update("parentFirstName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regParentLast">Last name</Label>
          <Input
            id="regParentLast"
            required
            value={form.parentLastName}
            onChange={(e) => update("parentLastName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regEmail">Email</Label>
          <Input
            id="regEmail"
            type="email"
            required
            value={form.parentEmail}
            onChange={(e) => update("parentEmail", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regPhone">Phone</Label>
          <Input
            id="regPhone"
            type="tel"
            required
            value={form.parentPhone}
            onChange={(e) => update("parentPhone", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="form-fieldset grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 px-1 font-heading text-lg tracking-wide sm:col-span-2">
          Athlete
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="regAthleteFirst">First name</Label>
          <Input
            id="regAthleteFirst"
            required
            value={form.athleteFirstName}
            onChange={(e) => update("athleteFirstName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regAthleteLast">Last name</Label>
          <Input
            id="regAthleteLast"
            required
            value={form.athleteLastName}
            onChange={(e) => update("athleteLastName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regDob">Date of birth</Label>
          <Input
            id="regDob"
            type="date"
            required
            value={form.athleteDob}
            onChange={(e) => update("athleteDob", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regGrade">School grade / grad year</Label>
          <Input
            id="regGrade"
            value={form.schoolGrade}
            onChange={(e) => update("schoolGrade", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regHw">Height &amp; weight</Label>
          <Input
            id="regHw"
            value={form.heightWeight}
            onChange={(e) => update("heightWeight", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regPos">Position in sports</Label>
          <Input
            id="regPos"
            value={form.sportPosition}
            onChange={(e) => update("sportPosition", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="regHealth">Health issues or allergies</Label>
          <Textarea
            id="regHealth"
            rows={3}
            value={form.healthIssues}
            onChange={(e) => update("healthIssues", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="form-fieldset grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 px-1 font-heading text-lg tracking-wide sm:col-span-2">
          Emergency contacts
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="regEc1Name">Contact 1 name</Label>
          <Input
            id="regEc1Name"
            required
            value={form.emergencyContact1Name}
            onChange={(e) => update("emergencyContact1Name", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regEc1Phone">Contact 1 phone</Label>
          <Input
            id="regEc1Phone"
            type="tel"
            required
            value={form.emergencyContact1Phone}
            onChange={(e) => update("emergencyContact1Phone", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regEc2Name">Contact 2 name (optional)</Label>
          <Input
            id="regEc2Name"
            value={form.emergencyContact2Name}
            onChange={(e) => update("emergencyContact2Name", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regEc2Phone">Contact 2 phone (optional)</Label>
          <Input
            id="regEc2Phone"
            type="tel"
            value={form.emergencyContact2Phone}
            onChange={(e) => update("emergencyContact2Phone", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="form-fieldset space-y-3">
        <legend className="font-heading text-lg tracking-wide">
          Shirt &amp; goals
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="regShirt">Shirt size</Label>
          <select
            id="regShirt"
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
          <Label htmlFor="regGoal">Goal to be a DAWG in your sport</Label>
          <Textarea
            id="regGoal"
            rows={3}
            value={form.goal}
            onChange={(e) => update("goal", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="form-fieldset space-y-3 rounded-xl border border-border p-4">
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
            I accept the{" "}
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
      </fieldset>

      <Button
        type="submit"
        disabled={submitting}
        className="h-12 w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto sm:px-8"
      >
        {submitting ? "Creating account…" : "Create account & continue"}
      </Button>
    </form>
  );
}
