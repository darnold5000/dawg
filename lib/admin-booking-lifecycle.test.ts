import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  canHardDeleteBooking,
  hardDeleteBlockReason,
  isActiveRosterBooking,
  isAwaitingPaymentHold,
  isConfirmedRosterBooking,
  REMOVE_FROM_SESSION_CONFIRMATION,
  type BookingFinancialSnapshot,
} from "./booking-roster";
import { isAdminRole, isStaffRole } from "./roles";

function snapshot(
  overrides: Partial<BookingFinancialSnapshot> = {},
): BookingFinancialSnapshot {
  return {
    status: "confirmed",
    payment_status: "unpaid",
    amount_paid_cents: 0,
    stripe_payment_intent_id: null,
    stripe_checkout_session_id: null,
    stripe_charge_id: null,
    ...overrides,
  };
}

describe("isActiveRosterBooking", () => {
  it("counts confirmed bookings toward the roster", () => {
    assert.equal(isActiveRosterBooking({ status: "confirmed" }), true);
  });

  it("counts unexpired pending holds", () => {
    assert.equal(
      isActiveRosterBooking({
        status: "pending",
        booking_expires_at: new Date(Date.now() + 60_000).toISOString(),
      }),
      true,
    );
  });

  it("does not count cancelled, expired, waitlisted, or failed bookings", () => {
    assert.equal(isActiveRosterBooking({ status: "cancelled" }), false);
    assert.equal(isActiveRosterBooking({ status: "expired" }), false);
    assert.equal(isActiveRosterBooking({ status: "waitlisted" }), false);
    assert.equal(isActiveRosterBooking({ status: "failed" }), false);
  });

  it("does not count attendance-cancelled bookings even if status is still confirmed", () => {
    assert.equal(
      isActiveRosterBooking({
        status: "confirmed",
        attendance_status: "cancelled",
      }),
      false,
    );
  });

  it("does not count expired pending holds", () => {
    assert.equal(
      isActiveRosterBooking({
        status: "pending",
        booking_expires_at: new Date(Date.now() - 60_000).toISOString(),
      }),
      false,
    );
  });
});

describe("confirmed vs Stripe hold display", () => {
  it("does not treat an unpaid Stripe hold as a roster athlete", () => {
    const hold = {
      status: "pending",
      payment_method: "stripe",
      payment_status: "pending",
      booking_expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    assert.equal(isActiveRosterBooking(hold), true);
    assert.equal(isConfirmedRosterBooking(hold), false);
    assert.equal(isAwaitingPaymentHold(hold), true);
  });

  it("treats pay-at-facility unpaid as a confirmed booking", () => {
    const facility = {
      status: "confirmed",
      payment_method: "pay_at_facility",
      payment_status: "unpaid",
    };
    assert.equal(isConfirmedRosterBooking(facility), true);
    assert.equal(isAwaitingPaymentHold(facility), false);
  });
});

describe("hard delete / remove from session", () => {
  it("allows removing an unpaid booking with no financial history", () => {
    assert.equal(canHardDeleteBooking(snapshot()), true);
    assert.equal(hardDeleteBlockReason(snapshot()), null);
  });

  it("blocks paid, refunded, Stripe, redemption, and payment-transaction bookings", () => {
    assert.match(
      hardDeleteBlockReason(snapshot({ payment_status: "paid" })) ?? "",
      /paid/i,
    );
    assert.match(
      hardDeleteBlockReason(snapshot({ payment_status: "refunded" })) ?? "",
      /paid/i,
    );
    assert.match(
      hardDeleteBlockReason(snapshot({ amount_paid_cents: 2500 })) ?? "",
      /payment/i,
    );
    assert.match(
      hardDeleteBlockReason(
        snapshot({ stripe_payment_intent_id: "pi_test" }),
      ) ?? "",
      /stripe/i,
    );
    assert.match(
      hardDeleteBlockReason(snapshot(), { hasRedemption: true }) ?? "",
      /redemption/i,
    );
    assert.match(
      hardDeleteBlockReason(snapshot(), { hasPaymentTransaction: true }) ?? "",
      /payment record/i,
    );
  });

  it("asks the owner to confirm permanent removal vs cancel", () => {
    assert.match(REMOVE_FROM_SESSION_CONFIRMATION, /Remove this client from the session/);
    assert.match(REMOVE_FROM_SESSION_CONFIRMATION, /Use Cancel instead/);
  });
});

describe("remove endpoint authorization", () => {
  it("is owner/admin only — trainers are staff but not admin", () => {
    assert.equal(isStaffRole("trainer"), true);
    assert.equal(isAdminRole("trainer"), false);
    assert.equal(isAdminRole("owner"), true);
    assert.equal(isAdminRole("admin"), true);
    assert.equal(isAdminRole("developer"), true);
  });

  it("wires remove through requireAdminApi and cancel through requireStaffApi", () => {
    const removeSrc = readFileSync(
      path.join(process.cwd(), "app/api/admin/bookings/[id]/remove/route.ts"),
      "utf8",
    );
    const cancelSrc = readFileSync(
      path.join(process.cwd(), "app/api/admin/bookings/[id]/cancel/route.ts"),
      "utf8",
    );
    assert.match(removeSrc, /requireAdminApi/);
    assert.equal(/requireStaffApi/.test(removeSrc), false);
    assert.match(cancelSrc, /requireStaffApi/);
  });
});
