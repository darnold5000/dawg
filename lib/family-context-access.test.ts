import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { RememberedFamily } from "./family-device";
import {
  bookingContextContainsSensitivePii,
  emptyFamilyBookingContext,
  emptyIntakeFormContext,
  intakeContextContainsSensitivePii,
  resolveAuthorizedFamilyContextQuery,
} from "./family-context-access";
import { resolveSessionBookingPayment } from "./booking-payment-decision";
import { intakeSchema } from "./intake";

const FAMILY_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const FAMILY_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ATHLETE_A = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const ATHLETE_B = "dddddddd-dddd-dddd-dddd-dddddddddddd";

function mockFamily(
  overrides: Partial<RememberedFamily> = {},
): RememberedFamily {
  return {
    parentId: FAMILY_A_ID,
    parentFirstName: "Jane",
    parentLastName: "Doe",
    parentEmail: "jane@example.com",
    parentPhone: "555-0100",
    athletes: [
      {
        id: ATHLETE_A,
        firstName: "Kid",
        lastName: "Doe",
        dob: "2015-06-01",
      },
    ],
    agreementsVersion: "v1",
    agreementsAcceptedAt: "2026-01-01T00:00:00.000Z",
    agreementsCurrent: true,
    mediaConsentPreference: false,
    ...overrides,
  };
}

describe("empty family context payloads", () => {
  it("intake empty context has no sensitive fields", () => {
    const empty = emptyIntakeFormContext();
    assert.equal(intakeContextContainsSensitivePii(empty), false);
    assert.equal(empty.mode, "full");
    assert.equal(empty.parentId, null);
    assert.equal(empty.parent, null);
  });

  it("booking empty context has no sensitive fields", () => {
    const empty = emptyFamilyBookingContext();
    assert.equal(bookingContextContainsSensitivePii(empty), false);
    assert.equal(empty.creditsRemaining, 0);
    assert.equal(empty.athletesOnFile.length, 0);
  });

  it("anonymous known vs unknown email responses are identical (no enumeration)", () => {
    const known = emptyIntakeFormContext();
    const unknown = emptyIntakeFormContext();
    assert.deepEqual(known, unknown);
    assert.deepEqual(emptyFamilyBookingContext(), emptyFamilyBookingContext());
  });
});

describe("resolveAuthorizedFamilyContextQuery", () => {
  it("returns null without a device session", () => {
    assert.equal(
      resolveAuthorizedFamilyContextQuery(null, {
        email: "jane@example.com",
        parentId: FAMILY_A_ID,
      }),
      null,
    );
  });

  it("ignores email lookup — only cookie family is authorized", () => {
    const family = mockFamily();
    const resolved = resolveAuthorizedFamilyContextQuery(family, {
      email: "jane@example.com",
    });
    assert.equal(resolved?.parentId, FAMILY_A_ID);
  });

  it("rejects mismatched parentId (Family A cookie + Family B parentId query)", () => {
    const family = mockFamily();
    assert.equal(
      resolveAuthorizedFamilyContextQuery(family, {
        parentId: FAMILY_B_ID,
      }),
      null,
    );
  });

  it("rejects mismatched email on cookie session", () => {
    const family = mockFamily();
    assert.equal(
      resolveAuthorizedFamilyContextQuery(family, {
        email: "other@example.com",
      }),
      null,
    );
  });

  it("rejects athleteId not on the remembered family", () => {
    const family = mockFamily();
    assert.equal(
      resolveAuthorizedFamilyContextQuery(family, { athleteId: ATHLETE_B }),
      null,
    );
  });

  it("allows athlete selection within the remembered family", () => {
    const family = mockFamily();
    const resolved = resolveAuthorizedFamilyContextQuery(family, {
      athleteId: ATHLETE_A,
      athleteFirstName: "Kid",
      athleteLastName: "Doe",
      athleteDob: "2015-06-01",
    });
    assert.equal(resolved?.parentId, FAMILY_A_ID);
    assert.equal(resolved?.athleteId, ATHLETE_A);
  });
});

describe("route authorization wiring", () => {
  it("intake context route gates on device session, not email lookup", () => {
    const src = readFileSync(
      path.join(process.cwd(), "app/api/intake/context/route.ts"),
      "utf8",
    );
    assert.match(src, /loadRememberedFamily/);
    assert.match(src, /resolveAuthorizedFamilyContextQuery/);
    assert.match(src, /emptyIntakeFormContext/);
    assert.equal(/ilike\("email"/.test(src), false);
    assert.equal(/getIntakeFormContext\([\s\S]*email:/.test(src), false);
  });

  it("booking-context route does not lookup parents by email", () => {
    const src = readFileSync(
      path.join(process.cwd(), "app/api/family/booking-context/route.ts"),
      "utf8",
    );
    assert.match(src, /loadRememberedFamily/);
    assert.match(src, /emptyFamilyBookingContext/);
    assert.match(src, /resolveAuthorizedFamilyContextQuery/);
    assert.equal(/ilike\("email"/.test(src), false);
  });

  it("getIntakeFormContext no longer resolves parent by email", () => {
    const src = readFileSync(
      path.join(process.cwd(), "lib/intake.ts"),
      "utf8",
    );
    assert.equal(/ilike\("email"/.test(src), false);
  });
});

describe("intake guest flow", () => {
  it("brand-new family intake schema accepts a full submission", () => {
    const parsed = intakeSchema.parse({
      parentFirstName: "New",
      parentLastName: "Family",
      parentEmail: "new@example.com",
      parentPhone: "555-0199",
      athleteFirstName: "Athlete",
      athleteLastName: "One",
      athleteDob: "2016-03-15",
      emergencyContact1Name: "Emergency Contact",
      emergencyContact1Phone: "555-0200",
      packageInterest: "single",
      acceptWaiver: true,
      rememberFamily: true,
    });
    assert.equal(parsed.parentEmail, "new@example.com");
    assert.equal(parsed.athleteDob, "2016-03-15");
  });
});

describe("booking payment without context GET", () => {
  it("package credits still skip Stripe when eligible credits exist", () => {
    const decision = resolveSessionBookingPayment({
      rosterCredit: false,
      eligibleCreditCount: 3,
      requestedPaymentMethod: "stripe",
      sessionPriceCents: 2500,
      paymentRequirement: "online_or_facility",
      onlinePaymentEnabled: true,
    });
    assert.equal(decision.coveredByPackageCredit, true);
    assert.equal(decision.requiresCheckout, false);
    assert.equal(decision.amountDueCents, 0);
  });

  it("no credits still requires Stripe checkout", () => {
    const decision = resolveSessionBookingPayment({
      rosterCredit: false,
      eligibleCreditCount: 0,
      requestedPaymentMethod: "stripe",
      sessionPriceCents: 2500,
      paymentRequirement: "online_or_facility",
      onlinePaymentEnabled: true,
    });
    assert.equal(decision.coveredByPackageCredit, false);
    assert.equal(decision.requiresCheckout, true);
    assert.equal(decision.amountDueCents, 2500);
  });

  it("booking decision does not mutate credit balances", () => {
    const before = 5;
    resolveSessionBookingPayment({
      rosterCredit: false,
      eligibleCreditCount: before,
      requestedPaymentMethod: "stripe",
      sessionPriceCents: 2500,
      paymentRequirement: "online_or_facility",
      onlinePaymentEnabled: true,
    });
    assert.equal(before, 5);
  });
});

describe("family magic-link flow", () => {
  it("verifyFamilyLoginToken sets the device cookie", () => {
    const src = readFileSync(
      path.join(process.cwd(), "lib/family-login.ts"),
      "utf8",
    );
    assert.match(src, /verifyFamilyLoginToken/);
    assert.match(src, /rememberFamilyOnDevice/);
    assert.match(src, /setFamilyDeviceCookie/);
  });

  it("requestFamilyAccessLink avoids email enumeration on success", () => {
    const src = readFileSync(
      path.join(process.cwd(), "lib/family-login.ts"),
      "utf8",
    );
    assert.match(src, /Always returns success to avoid email enumeration/);
    assert.match(src, /return \{ ok: true \}/);
  });

  it("login API returns ok without revealing whether email exists", () => {
    const src = readFileSync(
      path.join(process.cwd(), "app/api/my/login/route.ts"),
      "utf8",
    );
    assert.match(src, /requestFamilyAccessLink/);
    assert.match(src, /ok: true/);
  });
});

describe("client forms avoid email-based context lookup", () => {
  it("family intake form does not fetch context on email blur", () => {
    const src = readFileSync(
      path.join(process.cwd(), "components/public/family-intake-form.tsx"),
      "utf8",
    );
    assert.equal(/onParentEmailBlur/.test(src), false);
    assert.equal(/params\.set\("email"/.test(src), false);
    assert.match(src, /FAMILY_RESTORE_ACCESS_COPY/);
  });

  it("booking form only loads booking-context when savedFamily exists", () => {
    const src = readFileSync(
      path.join(process.cwd(), "components/public/booking-form.tsx"),
      "utf8",
    );
    assert.match(src, /if \(!savedFamily\)/);
    assert.equal(/params\.set\("email"/.test(src), false);
    assert.match(src, /FAMILY_RESTORE_ACCESS_COPY/);
  });

  it("waitlist route is unchanged and does not use family context APIs", () => {
    const src = readFileSync(
      path.join(process.cwd(), "app/api/waitlist/route.ts"),
      "utf8",
    );
    assert.match(src, /joinWaitlist/);
    assert.equal(/booking-context/.test(src), false);
    assert.equal(/intake\/context/.test(src), false);
  });
});

describe("multi-athlete remembered family", () => {
  it("authorizes each athlete id belonging to the cookie family", () => {
    const family = mockFamily({
      athletes: [
        {
          id: ATHLETE_A,
          firstName: "First",
          lastName: "Kid",
          dob: "2015-01-01",
        },
        {
          id: ATHLETE_B,
          firstName: "Second",
          lastName: "Kid",
          dob: "2017-02-02",
        },
      ],
    });
    const first = resolveAuthorizedFamilyContextQuery(family, {
      athleteId: ATHLETE_A,
    });
    const second = resolveAuthorizedFamilyContextQuery(family, {
      athleteId: ATHLETE_B,
    });
    assert.equal(first?.athleteId, ATHLETE_A);
    assert.equal(second?.athleteId, ATHLETE_B);
  });
});
