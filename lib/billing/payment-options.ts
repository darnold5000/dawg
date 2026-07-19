import type { PaymentMethod, PaymentRequirement } from "@/lib/types/database";

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

export function defaultPaymentMethod(
  requirement: PaymentRequirement | string,
): PaymentMethod | null {
  const allowed = allowedPaymentMethods(requirement);
  if (allowed.length === 1) return allowed[0];
  // Do not silently prefer facility when online is also available
  return null;
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return method === "stripe" ? "Pay online" : "Pay at facility";
}
