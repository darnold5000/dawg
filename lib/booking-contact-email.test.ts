import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyRememberedFamilyToBookingBody,
  authoritativeGuardianEmail,
} from "./booking-contact-email";
import { bookingSchema } from "./bookings";

const validGuest = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  parentFirstName: "Pat",
  parentLastName: "Guardian",
  parentEmail: "pat@example.com",
  parentPhone: "555-123-4567",
  athleteFirstName: "Alex",
  athleteLastName: "Athlete",
  athleteDob: "2015-06-01",
  mediaConsent: false,
};

describe("remembered-family booking email", () => {
  it("prefers the authenticated family email over an empty or stale draft", () => {
    const decided = authoritativeGuardianEmail({
      rememberedEmail: "dawg@hiresignalworks.com",
      formEmail: "",
      draftEmail: "not-an-email",
    });
    assert.equal(decided.email, "dawg@hiresignalworks.com");
    assert.equal(decided.source, "remembered");
  });

  it("overwrites submitted email from the remembered family before validation", () => {
    const body = applyRememberedFamilyToBookingBody(
      { ...validGuest, parentEmail: "" },
      {
        parentEmail: "dawg@hiresignalworks.com",
        parentFirstName: "DAWG",
        parentLastName: "Family",
        parentPhone: "555-000-0000",
      },
    );
    assert.equal(body.parentEmail, "dawg@hiresignalworks.com");
    const parsed = bookingSchema.safeParse(body);
    assert.equal(parsed.success, true);
  });

  it("still rejects an actually invalid guest email", () => {
    const parsed = bookingSchema.safeParse({
      ...validGuest,
      parentEmail: "abc",
    });
    assert.equal(parsed.success, false);
    if (parsed.success) return;
    const messages = parsed.error.issues.map((issue) => issue.message);
    assert.equal(messages.includes("Enter a valid email address"), true);
    assert.equal(messages.includes("Invalid email address"), false);
  });
});
