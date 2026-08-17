import type { PaymentMethod, PaymentStatus } from "@/lib/types/database";

export type SessionBookingPaymentInput = {
  rosterCredit: boolean;
  eligibleCreditCount: number;
  requestedPaymentMethod: "stripe" | "pay_at_facility" | undefined;
  sessionPriceCents: number;
  paymentRequirement: string;
  onlinePaymentEnabled: boolean;
};

export type SessionBookingPaymentDecision = {
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  amountDueCents: number;
  requiresCheckout: boolean;
  coveredByPackageCredit: boolean;
  error?: { code: string; message: string };
};

/**
 * Decide how a public booking is paid after guardian + athlete are resolved.
 * Package credits skip Stripe and do not change the credit balance.
 */
export function resolveSessionBookingPayment(
  input: SessionBookingPaymentInput,
): SessionBookingPaymentDecision {
  if (input.rosterCredit) {
    return {
      paymentMethod: null,
      paymentStatus: "not_required",
      amountDueCents: 0,
      requiresCheckout: false,
      coveredByPackageCredit: false,
    };
  }

  if (input.eligibleCreditCount > 0) {
    return {
      paymentMethod: "package_credit",
      paymentStatus: "not_required",
      amountDueCents: 0,
      requiresCheckout: false,
      coveredByPackageCredit: true,
    };
  }

  const requested = input.requestedPaymentMethod;
  if (!requested) {
    return {
      paymentMethod: null,
      paymentStatus: "unpaid",
      amountDueCents: Number(input.sessionPriceCents) || 0,
      requiresCheckout: false,
      coveredByPackageCredit: false,
      error: {
        code: "PAYMENT_REQUIRED",
        message: "Please select a payment method.",
      },
    };
  }

  if (requested === "stripe" && !input.onlinePaymentEnabled) {
    return {
      paymentMethod: requested,
      paymentStatus: "pending",
      amountDueCents: Number(input.sessionPriceCents) || 0,
      requiresCheckout: false,
      coveredByPackageCredit: false,
      error: {
        code: "ONLINE_PAYMENT_DISABLED",
        message:
          "Online payment is not available right now. Please try again later or contact us.",
      },
    };
  }

  const requirement = input.paymentRequirement;
  if (
    requested === "stripe" &&
    requirement !== "pay_online" &&
    requirement !== "online_or_facility"
  ) {
    return {
      paymentMethod: requested,
      paymentStatus: "pending",
      amountDueCents: Number(input.sessionPriceCents) || 0,
      requiresCheckout: false,
      coveredByPackageCredit: false,
      error: {
        code: "ONLINE_PAYMENT_NOT_ALLOWED",
        message: "Online payment is not available for this session.",
      },
    };
  }

  if (
    requested === "pay_at_facility" &&
    requirement !== "pay_at_facility" &&
    requirement !== "online_or_facility" &&
    !(requirement === "pay_online" && !input.onlinePaymentEnabled)
  ) {
    return {
      paymentMethod: requested,
      paymentStatus: "unpaid",
      amountDueCents: Number(input.sessionPriceCents) || 0,
      requiresCheckout: false,
      coveredByPackageCredit: false,
      error: {
        code: "FACILITY_PAYMENT_NOT_ALLOWED",
        message: "Online payment is required for this session.",
      },
    };
  }

  return {
    paymentMethod: requested,
    paymentStatus: requested === "stripe" ? "pending" : "unpaid",
    amountDueCents: Number(input.sessionPriceCents) || 0,
    requiresCheckout: requested === "stripe",
    coveredByPackageCredit: false,
  };
}
