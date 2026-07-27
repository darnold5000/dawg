import { describe, expect, it } from "vitest";

import {
  isValidEmail,
  isValidUsPhone,
  validateEmergencyContacts,
} from "./validation";

describe("forms validation", () => {
  it("validates email", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("bad")).toBe(false);
  });

  it("validates US phone", () => {
    expect(isValidUsPhone("(317) 835-1076")).toBe(true);
    expect(isValidUsPhone("123")).toBe(false);
  });

  it("requires primary emergency contact", () => {
    expect(
      validateEmergencyContacts({
        primary: { name: "", phone: "" },
      }),
    ).toMatch(/name/i);
  });
});
