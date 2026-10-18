import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSessionBookingPayment } from "./booking-payment-decision";
import {
  allowedPackageSlugsForProgram,
  filterPurchasesByProgramSlug,
  requiresPackageCreditToBook,
  STRENGTH_DEVELOPMENT_PROGRAM_SLUG,
  TWELVE_WEEK_PACKAGE_SLUG,
} from "./program-package-credits";
import type { PackagePurchaseWithPackage } from "./types/database";

function purchase(
  slug: string,
  remaining: number,
): PackagePurchaseWithPackage {
  return {
    id: "p1",
    parent_id: "g1",
    package_id: "pkg",
    athlete_id: null,
    status: "paid",
    sessions_total: remaining,
    sessions_remaining: remaining,
    amount_paid_cents: 0,
    currency: "usd",
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: null,
    stripe_customer_id: null,
    paid_at: null,
    refunded_at: null,
    created_at: "",
    updated_at: "",
    package: {
      id: "pkg",
      slug,
      name: slug,
      description: null,
      session_count: remaining,
      price_cents: 0,
      currency: "usd",
      active: true,
      display_order: 0,
      created_at: "",
      updated_at: "",
    },
  };
}

describe("program package credits", () => {
  it("allows 12-week and session packs on Strength Development", () => {
    const slugs = allowedPackageSlugsForProgram(STRENGTH_DEVELOPMENT_PROGRAM_SLUG);
    assert.ok(slugs.includes(TWELVE_WEEK_PACKAGE_SLUG));
    assert.ok(slugs.includes("single"));
  });

  it("excludes 12-week from All Dawgs-style programs", () => {
    const slugs = allowedPackageSlugsForProgram("all-dawgs");
    assert.ok(!slugs.includes(TWELVE_WEEK_PACKAGE_SLUG));
    assert.ok(slugs.includes("pack-10"));
  });

  it("filters purchases by program", () => {
    const rows = [
      purchase(TWELVE_WEEK_PACKAGE_SLUG, 12),
      purchase("single", 1),
    ];
    const forStrength = filterPurchasesByProgramSlug(
      rows,
      STRENGTH_DEVELOPMENT_PROGRAM_SLUG,
    );
    assert.equal(forStrength.length, 2);
    const forAllDawgs = filterPurchasesByProgramSlug(rows, "all-dawgs");
    assert.equal(forAllDawgs.length, 1);
    assert.equal(forAllDawgs[0].package?.slug, "single");
  });

  it("requires package balance for Strength when no credits", () => {
    assert.equal(requiresPackageCreditToBook(STRENGTH_DEVELOPMENT_PROGRAM_SLUG), true);
    const decision = resolveSessionBookingPayment({
      rosterCredit: false,
      eligibleCreditCount: 0,
      packageCreditsOnly: true,
      requestedPaymentMethod: "stripe",
      sessionPriceCents: 60000,
      paymentRequirement: "online_or_facility",
      onlinePaymentEnabled: true,
    });
    assert.equal(decision.error?.code, "PACKAGE_CREDITS_REQUIRED");
    assert.equal(decision.requiresCheckout, false);
  });
});
