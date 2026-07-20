"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import type { TrainingPackage } from "@/lib/types/database";

type ContactFields = {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
};

export function PackagePurchaseCards({
  packages,
  initialContact,
}: {
  packages: TrainingPackage[];
  initialContact?: Partial<ContactFields>;
}) {
  const [contact, setContact] = useState<ContactFields>({
    parentFirstName: initialContact?.parentFirstName ?? "",
    parentLastName: initialContact?.parentLastName ?? "",
    parentEmail: initialContact?.parentEmail ?? "",
    parentPhone: initialContact?.parentPhone ?? "",
  });
  const [purchasingSlug, setPurchasingSlug] = useState<string | null>(null);

  function update<K extends keyof ContactFields>(key: K, value: ContactFields[K]) {
    setContact((prev) => ({ ...prev, [key]: value }));
  }

  async function purchase(pkg: TrainingPackage) {
    if (
      !contact.parentFirstName.trim() ||
      !contact.parentLastName.trim() ||
      !contact.parentEmail.trim() ||
      !contact.parentPhone.trim()
    ) {
      toast.error("Enter your name, email, and phone before purchasing.");
      return;
    }

    setPurchasingSlug(pkg.slug);
    try {
      const res = await fetch("/api/packages/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageSlug: pkg.slug,
          ...contact,
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
      setPurchasingSlug(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="form-panel grid gap-4 sm:grid-cols-2">
        <p className="sm:col-span-2 text-sm text-muted-foreground">
          Enter your contact info once, then choose a package to pay securely with
          Stripe.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="parentFirstName">First name</Label>
          <Input
            id="parentFirstName"
            value={contact.parentFirstName}
            onChange={(e) => update("parentFirstName", e.target.value)}
            autoComplete="given-name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parentLastName">Last name</Label>
          <Input
            id="parentLastName"
            value={contact.parentLastName}
            onChange={(e) => update("parentLastName", e.target.value)}
            autoComplete="family-name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parentEmail">Email</Label>
          <Input
            id="parentEmail"
            type="email"
            value={contact.parentEmail}
            onChange={(e) => update("parentEmail", e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parentPhone">Phone</Label>
          <Input
            id="parentPhone"
            type="tel"
            value={contact.parentPhone}
            onChange={(e) => update("parentPhone", e.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="flex flex-col rounded-xl border border-border bg-card p-5"
          >
            <p className="font-heading text-xl tracking-wide">{pkg.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {pkg.session_count} session{pkg.session_count === 1 ? "" : "s"}
            </p>
            {pkg.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{pkg.description}</p>
            ) : null}
            <p className="mt-4 font-heading text-2xl tracking-wide">
              {formatPrice(pkg.price_cents)}
            </p>
            <Button
              type="button"
              className="mt-auto pt-6 bg-brand text-brand-foreground hover:bg-brand/90"
              disabled={purchasingSlug !== null}
              onClick={() => void purchase(pkg)}
            >
              {purchasingSlug === pkg.slug ? "Starting checkout…" : "Purchase"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
