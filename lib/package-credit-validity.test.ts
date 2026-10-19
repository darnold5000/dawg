import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  creditsValidUntilForPackage,
  creditsValidUntilFromPaidAt,
  isPackageCreditExpired,
} from "./package-credit-validity";
import {
  filterEligibleCreditsForAthlete,
  isUsablePackageCreditBalance,
} from "./package-credit-eligibility";

describe("package credit validity", () => {
  it("adds 12 weeks from paid_at for twelve-week catalog row", () => {
    const until = creditsValidUntilForPackage("2026-01-01T12:00:00.000Z", {
      validity_weeks: 12,
    });
    assert.ok(until);
    assert.equal(
      creditsValidUntilFromPaidAt("2026-01-01T12:00:00.000Z", 12),
      until,
    );
  });

  it("treats expired purchases as ineligible for booking", () => {
    const purchase = {
      status: "paid",
      sessions_remaining: 10,
      athlete_id: null,
      credits_valid_until: "2020-01-01T00:00:00.000Z",
    };
    assert.equal(isPackageCreditExpired(purchase), true);
    assert.equal(isUsablePackageCreditBalance(purchase), false);
    assert.equal(
      filterEligibleCreditsForAthlete(
        [purchase],
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      ).length,
      0,
    );
  });

  it("session packs without credits_valid_until do not expire", () => {
    const purchase = {
      status: "paid",
      sessions_remaining: 3,
      athlete_id: null,
      credits_valid_until: null,
    };
    assert.equal(isPackageCreditExpired(purchase), false);
    assert.equal(isUsablePackageCreditBalance(purchase), true);
  });
});
