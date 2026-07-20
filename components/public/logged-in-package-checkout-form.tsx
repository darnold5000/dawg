"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { TrainingPackage } from "@/lib/types/database";

export function LoggedInPackageCheckoutForm({
  packages,
  initialSlug,
  returnTo,
}: {
  packages: TrainingPackage[];
  initialSlug?: string;
  returnTo?: string;
}) {
  const [packageSlug, setPackageSlug] = useState(
    initialSlug && packages.some((p) => p.slug === initialSlug)
      ? initialSlug
      : packages[0]?.slug ?? "single",
  );
  const [submitting, setSubmitting] = useState(false);

  const selected = packages.find((p) => p.slug === packageSlug);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/packages/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageSlug,
          returnTo,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        toast.error("Please sign in to purchase a package");
        window.location.href = data.loginUrl ?? "/my/login";
        return;
      }
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
