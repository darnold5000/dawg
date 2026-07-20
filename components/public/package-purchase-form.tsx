"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PolicyLinkButton } from "@/components/public/policy-dialog";
import { formatPrice } from "@/lib/format";
import type { TrainingPackage } from "@/lib/types/database";

const SHIRT_SIZES = ["Small", "Medium", "Large", "XL", "XXL", "3XL"] as const;

export function PackagePurchaseForm({
  packages,
  initialSlug,
}: {
  packages: TrainingPackage[];
  initialSlug?: string;
}) {
  const [packageSlug, setPackageSlug] = useState(
    initialSlug && packages.some((p) => p.slug === initialSlug)
      ? initialSlug
      : packages[0]?.slug ?? "single",
  );
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
    rememberFamily: true,
  });

  const selected = packages.find((p) => p.slug === packageSlug);

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
      const res = await fetch("/api/packages/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageSlug,
          ...form,
          shirtSize: form.shirtSize || null,
          acceptWaiver: true as const,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not start checkout");
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      toast.error("Checkout URL missing");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="font-heading text-lg tracking-wide">
          Choose a package
        </legend>
        <div className="grid gap-3">
          {packages.map((pkg) => (
            <label
              key={pkg.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm ${
                packageSlug === pkg.slug
                  ? "border-brand bg-brand/10"
                  : "border-border"
              }`}
            >
              <input
                type="radio"
                name="packageSlug"
                className="mt-1"
                checked={packageSlug === pkg.slug}
                onChange={() => setPackageSlug(pkg.slug)}
                value={pkg.slug}
              />
              <span>
                <span className="font-medium">{pkg.name}</span>
                <span className="mt-0.5 block text-muted-foreground">
                  {pkg.description}
                </span>
                <span className="mt-1 block font-heading text-lg tracking-wide">
                  {formatPrice(pkg.price_cents)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 px-1 font-heading text-lg tracking-wide sm:col-span-2">
          Parent / guardian
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="pkgFirst">First name</Label>
          <Input
            id="pkgFirst"
            required
            value={form.parentFirstName}
            onChange={(e) => update("parentFirstName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkgLast">Last name</Label>
          <Input
            id="pkgLast"
            required
            value={form.parentLastName}
            onChange={(e) => update("parentLastName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkgEmail">Email</Label>
          <Input
            id="pkgEmail"
            type="email"
            required
            value={form.parentEmail}
            onChange={(e) => update("parentEmail", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkgPhone">Phone</Label>
          <Input
            id="pkgPhone"
            type="tel"
            required
            value={form.parentPhone}
            onChange={(e) => update("parentPhone", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 px-1 font-heading text-lg tracking-wide sm:col-span-2">
          Athlete
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="pkgAthleteFirst">First name</Label>
          <Input
            id="pkgAthleteFirst"
            required
            value={form.athleteFirstName}
            onChange={(e) => update("athleteFirstName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkgAthleteLast">Last name</Label>
          <Input
            id="pkgAthleteLast"
            required
            value={form.athleteLastName}
            onChange={(e) => update("athleteLastName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkgDob">Date of birth</Label>
          <Input
            id="pkgDob"
            type="date"
            required
            value={form.athleteDob}
            onChange={(e) => update("athleteDob", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkgGrade">School grade / grad year</Label>
          <Input
            id="pkgGrade"
            value={form.schoolGrade}
            onChange={(e) => update("schoolGrade", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkgHw">Height &amp; weight</Label>
          <Input
            id="pkgHw"
            value={form.heightWeight}
            onChange={(e) => update("heightWeight", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkgPos">Position in sports</Label>
          <Input
            id="pkgPos"
            value={form.sportPosition}
            onChange={(e) => update("sportPosition", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pkgHealth">Health issues or allergies</Label>
          <Textarea
            id="pkgHealth"
            rows={3}
            value={form.healthIssues}
            onChange={(e) => update("healthIssues", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 px-1 font-heading text-lg tracking-wide sm:col-span-2">
          Emergency contacts
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="pkgEc1Name">Contact 1 name</Label>
          <Input
            id="pkgEc1Name"
            required
            value={form.emergencyContact1Name}
            onChange={(e) => update("emergencyContact1Name", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkgEc1Phone">Contact 1 phone</Label>
          <Input
            id="pkgEc1Phone"
            type="tel"
            required
            value={form.emergencyContact1Phone}
            onChange={(e) => update("emergencyContact1Phone", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkgEc2Name">Contact 2 name (optional)</Label>
          <Input
            id="pkgEc2Name"
            value={form.emergencyContact2Name}
            onChange={(e) => update("emergencyContact2Name", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkgEc2Phone">Contact 2 phone (optional)</Label>
          <Input
            id="pkgEc2Phone"
            type="tel"
            value={form.emergencyContact2Phone}
            onChange={(e) => update("emergencyContact2Phone", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-heading text-lg tracking-wide">
          Shirt &amp; goals
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="pkgShirt">Shirt size</Label>
          <select
            id="pkgShirt"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
          <Label htmlFor="pkgGoal">Goal to be a DAWG in your sport</Label>
          <Textarea
            id="pkgGoal"
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
        disabled={submitting || !selected}
        className="h-12 w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto sm:px-8"
      >
        {submitting
          ? "Starting checkout…"
          : selected
            ? `Continue to pay ${formatPrice(selected.price_cents)}`
            : "Select a package"}
      </Button>
    </form>
  );
}
