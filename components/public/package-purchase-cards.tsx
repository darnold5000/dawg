"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  defaultPaymentMethod,
  isOnlineCardPaymentEnabled,
  paymentMethodLabel,
} from "@/lib/billing/payment-options";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types/database";
import type { TrainingPackage } from "@/lib/types/database";

type ContactFields = {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
};

const PACKAGE_PAYMENT_OPTIONS: PaymentMethod[] = ["stripe", "pay_at_facility"];

export function PackagePurchaseCards({
  packages,
  initialContact,
}: {
  packages: TrainingPackage[];
  initialContact?: Partial<ContactFields>;
}) {
  const router = useRouter();
  const [contact, setContact] = useState<ContactFields>({
    parentFirstName: initialContact?.parentFirstName ?? "",
    parentLastName: initialContact?.parentLastName ?? "",
    parentEmail: initialContact?.parentEmail ?? "",
    parentPhone: initialContact?.parentPhone ?? "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    () =>
      defaultPaymentMethod("online_or_facility") ?? "pay_at_facility",
  );
  const [purchasingSlug, setPurchasingSlug] = useState<string | null>(null);

  // SSR can disagree with the browser on isOnlineCardPaymentEnabled; sync default once mounted.
  useEffect(() => {
    const next = defaultPaymentMethod("online_or_facility");
    if (next) setPaymentMethod(next);
  }, []);

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
          paymentMethod,
          ...contact,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not start checkout");
        return;
      }
      if (data.payAtFacility && data.purchaseId) {
        router.push(
          `/packages/success?purchase_id=${encodeURIComponent(data.purchaseId)}&payment=pay_at_facility`,
        );
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

  if (packages.length === 0) {
    return (
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Packages are not set up yet. Run{" "}
        <code className="text-xs">scripts/seed-dawg-training-catalog.sql</code>{" "}
        in the Signal Works Pro SQL editor, then refresh this page.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <div className="form-panel grid gap-4 sm:grid-cols-2">
        <p className="sm:col-span-2 text-sm text-muted-foreground">
          Enter your contact info once, choose how you want to pay, then pick a
          package.
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

      <fieldset className="space-y-3 rounded-xl border border-border p-4">
        <legend className="px-1 font-heading text-lg tracking-wide">
          Payment
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {!isOnlineCardPaymentEnabled() ? (
            <div
              className="flex h-full items-start gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm opacity-80"
              aria-disabled
            >
              <input type="radio" className="mt-1" disabled readOnly />
              <span>
                <span className="font-medium text-muted-foreground">
                  {paymentMethodLabel("stripe")}
                </span>
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Coming soon
                </span>
                <span className="mt-0.5 block text-muted-foreground">
                  Online package checkout will be available soon.
                </span>
              </span>
            </div>
          ) : null}
          {(isOnlineCardPaymentEnabled()
            ? PACKAGE_PAYMENT_OPTIONS
            : (["pay_at_facility"] as PaymentMethod[])
          ).map((method) => (
            <label
              key={method}
              className={`flex h-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                paymentMethod === method
                  ? "border-brand bg-brand/10"
                  : "border-border"
              }`}
            >
              <input
                type="radio"
                name="packagePayment"
                className="mt-1"
                checked={paymentMethod === method}
                onChange={() => setPaymentMethod(method)}
                value={method}
              />
              <span>
                <span className="font-medium">{paymentMethodLabel(method)}</span>
                <span className="mt-0.5 block text-muted-foreground">
                  {method === "stripe"
                    ? "Secure card payment via Stripe."
                    : "Order is saved — pay when you arrive. Credits activate after staff confirms payment."}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="flex min-h-[220px] flex-col rounded-xl border border-border bg-card p-6 sm:p-7"
          >
            <div className="space-y-3">
              <p className="font-heading text-xl tracking-wide">{pkg.name}</p>
              <p className="font-heading text-3xl tracking-wide text-gold sm:text-4xl">
                {formatPrice(pkg.price_cents)}
              </p>
            </div>
            <Button
              type="button"
              className="mt-auto w-full justify-center bg-brand py-6 text-brand-foreground hover:bg-brand/90"
              disabled={purchasingSlug !== null}
              onClick={() => void purchase(pkg)}
            >
              {purchasingSlug === pkg.slug
                ? paymentMethod === "stripe"
                  ? "Starting checkout…"
                  : "Saving order…"
                : paymentMethod === "stripe"
                  ? "Purchase online"
                  : "Order — pay at facility"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
