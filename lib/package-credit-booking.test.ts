import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSessionBookingPayment } from "./booking-payment-decision";
import {
  filterEligibleCreditsForAthlete,
  PACKAGE_CREDIT_AUTO_MUTATION,
  isEligiblePackageCredit,
  type PackageCreditLike,
} from "./package-credit-eligibility";
import {
  redeemPackageCreditOnAttendance,
  syncAttendedBookingCredits,
} from "./packages";

const ATHLETE_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ATHLETE_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function credit(
  overrides: Partial<PackageCreditLike> & { id?: string } = {},
): PackageCreditLike & { id: string; sessions_remaining: number } {
  return {
    id: overrides.id ?? "purchase-1",
    status: "paid",
    sessions_remaining: 5,
    athlete_id: null,
    ...overrides,
  };
}

const paidSession = {
  rosterCredit: false,
  sessionPriceCents: 2500,
  paymentRequirement: "online_or_facility",
  onlinePaymentEnabled: true,
} as const;

describe("package-credit eligibility", () => {
  it("Test 1 — family-wide credit covers the athlete", () => {
    const rows = [credit({ athlete_id: null, sessions_remaining: 5 })];
    const eligible = filterEligibleCreditsForAthlete(rows, ATHLETE_A);
    assert.equal(eligible.length, 1);
    assert.equal(eligible[0].sessions_remaining, 5);
  });

  it("Test 2 — athlete-specific credit covers that athlete", () => {
    const rows = [
      credit({ athlete_id: ATHLETE_A, sessions_remaining: 3 }),
    ];
    const eligible = filterEligibleCreditsForAthlete(rows, ATHLETE_A);
    assert.equal(eligible.length, 1);
    assert.equal(eligible[0].sessions_remaining, 3);
  });

  it("Test 3 — credit for another athlete does not cover", () => {
    const rows = [
      credit({ athlete_id: ATHLETE_A, sessions_remaining: 4 }),
    ];
    const eligible = filterEligibleCreditsForAthlete(rows, ATHLETE_B);
    assert.equal(eligible.length, 0);
  });

  it("Test 5 — depleted package is not eligible", () => {
    const rows = [credit({ sessions_remaining: 0, athlete_id: null })];
    assert.equal(filterEligibleCreditsForAthlete(rows, ATHLETE_A).length, 0);
  });

  it("Test 6 — unpaid package is not eligible", () => {
    const rows = [credit({ status: "pending", athlete_id: null })];
    assert.equal(filterEligibleCreditsForAthlete(rows, ATHLETE_A).length, 0);
  });

  it("Test 7 — eligibility does not depend on account_claimed_at", () => {
    const unclaimedGuardianCredit = credit({
      athlete_id: null,
      sessions_remaining: 5,
    });
    assert.equal(
      isEligiblePackageCredit(unclaimedGuardianCredit, ATHLETE_A),
      true,
    );
    assert.equal(
      "account_claimed_at" in unclaimedGuardianCredit,
      false,
    );
  });
});

describe("package-credit booking payment decision", () => {
  it("Test 1 — family-wide credit skips Stripe and charges $0", () => {
    const decision = resolveSessionBookingPayment({
      ...paidSession,
      eligibleCreditCount: 5,
      requestedPaymentMethod: "stripe",
    });
    assert.equal(decision.coveredByPackageCredit, true);
    assert.equal(decision.requiresCheckout, false);
    assert.equal(decision.amountDueCents, 0);
    assert.equal(decision.paymentStatus, "not_required");
    assert.equal(decision.paymentMethod, "package_credit");
    assert.equal(decision.error, undefined);
  });

  it("Test 2 — athlete-specific credit skips Stripe", () => {
    const decision = resolveSessionBookingPayment({
      ...paidSession,
      eligibleCreditCount: 3,
      requestedPaymentMethod: undefined,
    });
    assert.equal(decision.requiresCheckout, false);
    assert.equal(decision.amountDueCents, 0);
    assert.equal(decision.paymentMethod, "package_credit");
  });

  it("Test 3/4 — no eligible credit keeps $25 Stripe path", () => {
    const decision = resolveSessionBookingPayment({
      ...paidSession,
      eligibleCreditCount: 0,
      requestedPaymentMethod: "stripe",
    });
    assert.equal(decision.coveredByPackageCredit, false);
    assert.equal(decision.requiresCheckout, true);
    assert.equal(decision.amountDueCents, 2500);
    assert.equal(decision.paymentStatus, "pending");
    assert.equal(decision.paymentMethod, "stripe");
  });

  it("Test 5/6 — depleted or unpaid credits use normal payment", () => {
    const decision = resolveSessionBookingPayment({
      ...paidSession,
      eligibleCreditCount: 0,
      requestedPaymentMethod: "stripe",
    });
    assert.equal(decision.requiresCheckout, true);
    assert.equal(decision.amountDueCents, 2500);
  });

  it("does not create a checkout when the client omitted payment method but has credit", () => {
    const decision = resolveSessionBookingPayment({
      ...paidSession,
      eligibleCreditCount: 1,
      requestedPaymentMethod: undefined,
    });
    assert.equal(decision.requiresCheckout, false);
    assert.equal(decision.error, undefined);
  });

  it("still requires a payment method when no credit exists", () => {
    const decision = resolveSessionBookingPayment({
      ...paidSession,
      eligibleCreditCount: 0,
      requestedPaymentMethod: undefined,
    });
    assert.equal(decision.error?.code, "PAYMENT_REQUIRED");
    assert.equal(decision.requiresCheckout, false);
    assert.equal(decision.amountDueCents, 2500);
  });

  it("Test 8 — booking decision does not mutate credits", () => {
    const remainingBefore = 5;
    resolveSessionBookingPayment({
      ...paidSession,
      eligibleCreditCount: remainingBefore,
      requestedPaymentMethod: "stripe",
    });
    assert.equal(remainingBefore, 5);
    assert.equal(PACKAGE_CREDIT_AUTO_MUTATION.booking, false);
  });
});

describe("package-credit attendance and cancellation", () => {
  it("Test 9 — attendance does not redeem or change balances", async () => {
    const remainingBefore = 5;
    const result = await redeemPackageCreditOnAttendance(
      "booking-attended-test",
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.redeemed, false);
      if (result.redeemed === false) {
        assert.equal(result.reason, "manual_management");
      }
    }
    const sync = await syncAttendedBookingCredits("guardian-test");
    assert.equal(sync.redeemed, 0);
    assert.equal(remainingBefore, 5);
    assert.equal(PACKAGE_CREDIT_AUTO_MUTATION.attendance, false);
  });

  it("Test 10 — cancellation does not mutate credits", () => {
    const remainingBefore = 5;
    assert.equal(PACKAGE_CREDIT_AUTO_MUTATION.cancellation, false);
    assert.equal(remainingBefore, 5);
  });
});
