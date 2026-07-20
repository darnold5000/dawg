"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import type { TrainingPackage } from "@/lib/types/database";

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
  });

  const selected = packages.find((p) => p.slug === packageSlug);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/packages/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageSlug,
          ...form,
          athleteFirstName: form.athleteFirstName || undefined,
          athleteLastName: form.athleteLastName || undefined,
          athleteDob: form.athleteDob || undefined,
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
    <form onSubmit={onSubmit} className="space-y-5">
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
          Athlete (optional)
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="pkgAthleteFirst">First name</Label>
          <Input
            id="pkgAthleteFirst"
            value={form.athleteFirstName}
            onChange={(e) => update("athleteFirstName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkgAthleteLast">Last name</Label>
          <Input
            id="pkgAthleteLast"
            value={form.athleteLastName}
            onChange={(e) => update("athleteLastName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pkgDob">Date of birth</Label>
          <Input
            id="pkgDob"
            type="date"
            value={form.athleteDob}
            onChange={(e) => update("athleteDob", e.target.value)}
          />
        </div>
      </fieldset>

      <Button
        type="submit"
        disabled={submitting || !selected}
        className="h-12 w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto sm:px-8"
      >
        {submitting
          ? "Starting checkout…"
          : selected
            ? `Pay ${formatPrice(selected.price_cents)}`
            : "Select a package"}
      </Button>
    </form>
  );
}
