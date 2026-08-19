import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { SITE } from "./constants";
import {
  formatAdminHoldUntil,
  formatHoldCountdown,
  formatHoldUntil,
  holdRemainingMs,
} from "./format";
import {
  isAwaitingPaymentHold,
  isConfirmedRosterBooking,
  occupiesCapacity,
} from "./booking-roster";

const ROOT = process.cwd();

describe("formatAdminHoldUntil (staff roster)", () => {
  it("uses America/Indiana/Indianapolis", () => {
    assert.equal(SITE.timezone, "America/Indiana/Indianapolis");
  });

  it("renders UTC 2026-08-19T04:40:00Z as 12:40 AM for admin", () => {
    const utc = "2026-08-19T04:40:00.000Z";
    assert.equal(formatAdminHoldUntil(utc), "12:40 AM");
    assert.notEqual(formatAdminHoldUntil(utc), "4:40 AM");
  });

  it("is DST-safe in Eastern Standard Time", () => {
    const utc = "2026-01-15T05:40:00.000Z";
    assert.equal(formatAdminHoldUntil(utc), "12:40 AM");
    assert.notEqual(formatAdminHoldUntil(utc), "5:40 AM");
  });

  it("is what the admin roster uses for Spot held until", () => {
    const roster = readFileSync(
      path.join(ROOT, "app/admin/sessions/[id]/roster/page.tsx"),
      "utf8",
    );
    assert.match(roster, /formatAdminHoldUntil\(booking\.booking_expires_at\)/);
    assert.equal(roster.includes("formatHoldUntil("), false);
  });
});

describe("client hold clock is unchanged", () => {
  it("family dashboard still uses formatHoldUntil, not the admin formatter", () => {
    const dashboard = readFileSync(
      path.join(ROOT, "components/public/family-dashboard.tsx"),
      "utf8",
    );
    assert.match(dashboard, /formatHoldUntil\(booking\.bookingExpiresAt\)/);
    assert.equal(dashboard.includes("formatAdminHoldUntil"), false);
  });
});

describe("hold countdown uses the absolute expiration instant", () => {
  it("does not apply timezone arithmetic", () => {
    const expiresAt = "2026-08-19T04:40:00.000Z";
    const nowMs = Date.parse("2026-08-19T04:27:02.000Z");
    const remaining = holdRemainingMs(expiresAt, nowMs);
    assert.equal(remaining, 12 * 60_000 + 58_000);
    assert.equal(formatHoldCountdown(remaining ?? 0), "12:58");
  });
});

describe("pending hold state is unchanged by display formatting", () => {
  it("still occupies capacity and is not a confirmed booking", () => {
    const hold = {
      status: "pending",
      payment_method: "stripe",
      payment_status: "pending",
      booking_expires_at: "2026-08-19T04:40:00.000Z",
      nowMs: Date.parse("2026-08-19T04:25:00.000Z"),
    };
    assert.equal(formatAdminHoldUntil(hold.booking_expires_at), "12:40 AM");
    assert.equal(occupiesCapacity(hold), true);
    assert.equal(isAwaitingPaymentHold(hold), true);
    assert.equal(isConfirmedRosterBooking(hold), false);
  });
});

describe("formatHoldUntil remains the client helper", () => {
  it("still exists for the family dashboard Client Component", () => {
    assert.equal(typeof formatHoldUntil, "function");
    assert.equal(formatHoldUntil(null), null);
  });
});
