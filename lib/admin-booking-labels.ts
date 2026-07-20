import type { PaymentMethod, PaymentStatus } from "@/lib/types/database";

export function adminPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "not_required":
      return "No payment";
    case "unpaid":
      return "Unpaid";
    case "pending":
      return "Pending";
    case "paid":
      return "Paid";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Partial refund";
    default:
      return String(status).replaceAll("_", " ");
  }
}

/** Staff-facing label for how this session is covered (not raw payment_method). */
export function adminBookingPaymentTypeLabel(input: {
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  packageName?: string | null;
}): string {
  if (input.packageName) {
    return `Package · ${input.packageName}`;
  }
  if (input.paymentMethod === "package_credit") {
    return "Package credit";
  }
  if (input.paymentStatus === "not_required") {
    return "Roster session";
  }
  if (input.paymentMethod === "stripe") {
    return "Pay online";
  }
  if (input.paymentMethod === "pay_at_facility") {
    return "Pay at facility";
  }
  return "—";
}
