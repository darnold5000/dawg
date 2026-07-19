/**
 * DAWG billing module.
 * Stripe primitives adapted from @signalworks/billing;
 * booking payment domain logic is DAWG-specific.
 */

export {
  attachCheckoutSession,
  claimStripeEvent,
  confirmPaidBooking,
  expirePendingBooking,
  getBookingForCheckout,
  listPaymentTransactions,
  markConfirmationEmailSent,
  markFacilityBookingPaid,
  markFacilityBookingUnpaid,
  markPaymentFailed,
  markStripeEventProcessed,
  refundBooking,
} from "./adapter";

export {
  allowedPaymentMethods,
  defaultPaymentMethod,
  paymentMethodLabel,
} from "./payment-options";

// Do not re-export booking-lookup / webhook-handlers here — they pull in
// next/headers via supabase/server and break client component bundles.

export { createBookingCheckout } from "./checkout";
export type { CreateBookingCheckoutResult } from "./checkout";

export {
  billingTableClassNames,
  centsToDollars,
  cn,
  dollarsToCents,
  formatDate,
  formatMoney,
} from "./format";

export { getStripe, isStripeConfigured } from "./stripe/server";
export { verifyStripeWebhook } from "./stripe/webhooks";
export type { VerifiedStripeEvent } from "./stripe/webhooks";

export type {
  AdapterResult,
  AttachCheckoutSessionInput,
  BookingPaymentRecord,
  ConfirmPaidBookingInput,
  ExpirePendingBookingInput,
  MarkFacilityBookingPaidInput,
  MarkPaymentFailedInput,
  PaymentStatusBadgeTone,
  RefundBookingInput,
} from "./types";
export { paymentStatusTone } from "./types";
