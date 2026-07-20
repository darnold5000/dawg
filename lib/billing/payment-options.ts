import type { PaymentMethod, PaymentRequirement } from "@/lib/types/database";

export function allowedPaymentMethods(
  requirement: PaymentRequirement | string,
  opts?: { hasPackageCredit?: boolean },
): PaymentMethod[] {
  const base: PaymentMethod[] = (() => {
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
  })();

  if (opts?.hasPackageCredit) {
    return ["package_credit", ...base];
  }
  return base;
}

export function defaultPaymentMethod(
  requirement: PaymentRequirement | string,
  opts?: { hasPackageCredit?: boolean },
): PaymentMethod | null {
  const allowed = allowedPaymentMethods(requirement, opts);
  if (opts?.hasPackageCredit && allowed.includes("package_credit")) {
    return "package_credit";
  }
  if (allowed.length === 1) return allowed[0];
  // Do not silently prefer facility when online is also available
  return null;
}

export function paymentMethodLabel(method: PaymentMethod): string {
  if (method === "stripe") return "Pay online";
  if (method === "package_credit") return "Use package credit";
  return "Pay at facility";
}
