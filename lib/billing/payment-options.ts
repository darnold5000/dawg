import type { PaymentMethod, PaymentRequirement } from "@/lib/types/database";

/**
 * Online card checkout (Stripe). Explicit opt-out: NEXT_PUBLIC_ONLINE_PAYMENT_ENABLED=false
 * Opt-in: NEXT_PUBLIC_ONLINE_PAYMENT_ENABLED=true, or Stripe keys present at build/runtime.
 */
export function isOnlineCardPaymentEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ONLINE_PAYMENT_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "no") return false;
  if (flag === "true" || flag === "1" || flag === "yes") return true;

  const hasPublishable = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
  );
  if (typeof window !== "undefined") {
    return hasPublishable;
  }
  return hasPublishable && Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function allowedPaymentMethods(
  requirement: PaymentRequirement | string,
): PaymentMethod[] {
  switch (requirement) {
    case "pay_online":
      return ["stripe"];
    case "pay_at_facility":
      return ["pay_at_facility"];
    case "online_or_facility":
      return ["stripe", "pay_at_facility"];
    default:
      return ["pay_at_facility"];
  }
}

/** Methods the customer can actually select (Stripe omitted when disabled). */
export function selectablePaymentMethods(
  requirement: PaymentRequirement | string,
): PaymentMethod[] {
  const allowed = allowedPaymentMethods(requirement);
  if (isOnlineCardPaymentEnabled()) return allowed;
  const withoutStripe = allowed.filter((m) => m !== "stripe");
  if (withoutStripe.length > 0) return withoutStripe;
  return ["pay_at_facility"];
}

export function defaultPaymentMethod(
  requirement: PaymentRequirement | string,
): PaymentMethod | null {
  const selectable = selectablePaymentMethods(requirement);
  if (selectable.length === 1) return selectable[0];
  if (selectable.includes("stripe")) return "stripe";
  if (selectable.includes("pay_at_facility")) return "pay_at_facility";
  return selectable[0] ?? null;
}

export function paymentMethodLabel(method: PaymentMethod): string {
  if (method === "stripe") return "Pay online";
  if (method === "package_credit") return "Use package credit";
  return "Pay at facility";
}
