import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  bookingStatusDisplayLabel,
  isAwaitingPaymentHold,
  isConfirmedRosterBooking,
  occupiesCapacity,
  publicOccupancyLabel,
  staffOccupancyLabel,
  summarizeSessionOccupancy,
} from "./booking-roster";
import {
  planBookingSubmit,
  type ExistingBookingSnapshot,
} from "./booking-retry";

const NOW = Date.parse("2026-08-19T00:55:19.536Z");
const HOLD_UNTIL = new Date(NOW + 12 * 60_000).toISOString();

function stripeHold(
  overrides: Partial<ExistingBookingSnapshot> = {},
): ExistingBookingSnapshot {
  return {
    id: "hold-1",
    session_id: "session-1",
    athlete_id: "athlete-1",
    guardian_id: "guardian-1",
    status: "pending",
    payment_method: "stripe",
    payment_status: "pending",
    booking_expires_at: HOLD_UNTIL,
    stripe_checkout_session_id: "cs_test_hold",
    confirmation_email_sent_at: null,
    amount_paid_cents: 0,
    ...overrides,
  };
}

function displaySnapshot(booking: ExistingBookingSnapshot, nowMs = NOW) {
  return {
    status: booking.status,
    payment_method: booking.payment_method,
    payment_status: booking.payment_status,
    booking_expires_at: booking.booking_expires_at,
    nowMs,
  };
}

describe("A. Stripe initial click is a payment hold, not a booking", () => {
  it("creates a pending Stripe hold that occupies capacity only", () => {
    const hold = displaySnapshot(stripeHold());
    assert.equal(occupiesCapacity(hold), true);
    assert.equal(isAwaitingPaymentHold(hold), true);
    assert.equal(isConfirmedRosterBooking(hold), false);
    assert.equal(bookingStatusDisplayLabel(hold), "Awaiting payment");
  });

  it("does not appear as a confirmed client booking or staff roster athlete", () => {
    const occupancy = summarizeSessionOccupancy(
      [displaySnapshot(stripeHold())],
      12,
      NOW,
    );
    assert.equal(occupancy.confirmedCount, 0);
    assert.equal(occupancy.pendingHoldCount, 1);
    assert.equal(occupancy.occupiedCount, 1);
    assert.equal(occupancy.availableCapacity, 11);
    assert.equal(
      staffOccupancyLabel(occupancy, 12),
      "0 confirmed · 1 awaiting payment · 11 available",
    );
    assert.equal(
      publicOccupancyLabel(occupancy, 12, false).primary,
      "0 booked · 1 spot temporarily held",
    );
  });
});

describe("B. Browser Back leaves the hold pending", () => {
  it("does not call the athlete booked after backing out of Checkout", () => {
    const hold = displaySnapshot(stripeHold());
    const plan = planBookingSubmit({
      existing: stripeHold(),
      nowMs: NOW,
      checkoutSession: {
        id: "cs_test_hold",
        status: "open",
        payment_status: "unpaid",
        url: "https://checkout.stripe.com/c/pay/cs_test_hold",
      },
    });
    assert.equal(hold.status, "pending");
    assert.equal(isConfirmedRosterBooking(hold), false);
    assert.equal(plan.action, "resume_stripe");
    if (plan.action === "resume_stripe") {
      assert.equal(plan.sendConfirmationEmail, false);
    }
  });
});

describe("C. Retry during hold resumes Checkout", () => {
  it("reuses the same row and does not return ALREADY_BOOKED", () => {
    const plan = planBookingSubmit({
      existing: stripeHold(),
      nowMs: NOW,
      checkoutSession: {
        id: "cs_test_hold",
        status: "open",
        payment_status: "unpaid",
        url: "https://checkout.stripe.com/c/pay/cs_test_hold",
      },
    });
    assert.equal(plan.action, "resume_stripe");
    if (plan.action === "resume_stripe") {
      assert.equal(plan.bookingId, "hold-1");
      assert.equal(plan.checkout, "reuse");
    }
  });
});

describe("D. Successful Stripe payment confirms the same row", () => {
  it("pending Stripe hold becomes a confirmed booking after verified payment", () => {
    const paid = displaySnapshot(
      stripeHold({
        status: "confirmed",
        payment_status: "paid",
        booking_expires_at: null,
        amount_paid_cents: 2500,
      }),
    );
    assert.equal(isAwaitingPaymentHold(paid), false);
    assert.equal(isConfirmedRosterBooking(paid), true);
    assert.equal(bookingStatusDisplayLabel(paid), "Confirmed");
    const occupancy = summarizeSessionOccupancy([paid], 12, NOW);
    assert.equal(occupancy.confirmedCount, 1);
    assert.equal(occupancy.pendingHoldCount, 0);
    assert.equal(staffOccupancyLabel(occupancy, 12), "1/12 booked");
  });
});

describe("E. Expired hold releases capacity and never confirms", () => {
  it("disappears from payment-hold views and frees the seat", () => {
    const expiredAt = NOW + 1_000;
    const expired = displaySnapshot(
      stripeHold({
        status: "expired",
        payment_status: "failed",
        booking_expires_at: HOLD_UNTIL,
      }),
      expiredAt,
    );
    const timedOutPending = displaySnapshot(
      stripeHold({
        booking_expires_at: new Date(NOW - 1_000).toISOString(),
      }),
      NOW,
    );
    assert.equal(occupiesCapacity(expired), false);
    assert.equal(isAwaitingPaymentHold(expired), false);
    assert.equal(isConfirmedRosterBooking(expired), false);
    assert.equal(occupiesCapacity(timedOutPending), false);
    assert.equal(isAwaitingPaymentHold(timedOutPending), false);
    const occupancy = summarizeSessionOccupancy([expired, timedOutPending], 12, NOW);
    assert.equal(occupancy.occupiedCount, 0);
    assert.equal(occupancy.availableCapacity, 12);
  });
});

describe("F. Pay at facility is a real booking immediately", () => {
  it("confirmed unpaid facility bookings appear on roster and in client account", () => {
    const facility = displaySnapshot({
      ...stripeHold(),
      status: "confirmed",
      payment_method: "pay_at_facility",
      payment_status: "unpaid",
      booking_expires_at: null,
      stripe_checkout_session_id: null,
    });
    assert.equal(isConfirmedRosterBooking(facility), true);
    assert.equal(isAwaitingPaymentHold(facility), false);
    assert.equal(occupiesCapacity(facility), true);
    assert.equal(bookingStatusDisplayLabel(facility), "Confirmed");
  });
});

describe("G. Package credit is a real booking", () => {
  it("confirmed package-credit bookings are not hidden as unpaid Stripe holds", () => {
    const credit = displaySnapshot({
      ...stripeHold(),
      status: "confirmed",
      payment_method: "package_credit",
      payment_status: "not_required",
      booking_expires_at: null,
      stripe_checkout_session_id: null,
    });
    assert.equal(isConfirmedRosterBooking(credit), true);
    assert.equal(isAwaitingPaymentHold(credit), false);
    assert.equal(bookingStatusDisplayLabel(credit), "Confirmed");
  });
});

describe("authoritative Stripe confirmation", () => {
  const root = process.cwd();

  it("creating Checkout does not confirm or email", () => {
    const bookings = readFileSync(path.join(root, "lib/bookings.ts"), "utf8");
    assert.match(
      bookings,
      /status: paymentMethod === "stripe" \? "pending" : "confirmed"/,
    );
    assert.match(bookings, /Stripe waits for webhook/);
    assert.match(bookings, /paymentMethod === "pay_at_facility"/);
    assert.match(bookings, /paymentMethod === "package_credit"/);
    const emailBlock = bookings.slice(
      bookings.indexOf("Confirmed roster / facility"),
    );
    assert.equal(emailBlock.includes('if (\n    paymentMethod === "pay_at_facility"'), true);
    assert.equal(
      /sendBookingConfirmation/.test(emailBlock) &&
        !/paymentMethod === "stripe"/.test(emailBlock),
      true,
    );
  });

  it("only verified Stripe payment updates pending → confirmed", () => {
    const adapter = readFileSync(path.join(root, "lib/billing/adapter.ts"), "utf8");
    assert.match(adapter, /export async function confirmPaidBooking/);
    assert.match(adapter, /status: "confirmed"/);
    assert.match(adapter, /payment_status: "paid"/);

    const reconcile = readFileSync(
      path.join(root, "lib/billing/reconcile-checkout.ts"),
      "utf8",
    );
    assert.match(reconcile, /if \(session\.payment_status !== "paid"\)/);
    assert.match(reconcile, /return \{ bookingId, confirmed: false \}/);
    assert.match(reconcile, /const result = await confirmPaidBooking/);
    assert.match(reconcile, /await sendConfirmationOnce\(bookingId\)/);
  });

  it("opening the success URL does not confirm unless Stripe reports paid", () => {
    const success = readFileSync(
      path.join(root, "app/(public)/booking/success/page.tsx"),
      "utf8",
    );
    assert.match(success, /Opening this URL does not confirm unless Stripe reports payment success/);
    assert.match(success, /Not booked yet/);
    assert.match(success, /stripePaid/);
  });
});
