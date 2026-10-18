import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isDropInSession,
  TWELVE_WEEK_PACKAGE_SLUG,
} from "./drop-in-sessions";

describe("drop-in sessions", () => {
  it("treats Strength Development as show-up only", () => {
    assert.equal(
      isDropInSession({ program: { slug: "strength-development" } }),
      true,
    );
    assert.equal(isDropInSession({ program: { slug: "little-dawgs" } }), false);
    assert.equal(isDropInSession({ program: { slug: "big-dawgs" } }), false);
    assert.equal(isDropInSession({ program: null }), false);
  });

  it("uses the catalog slug for the 12-week package", () => {
    assert.equal(TWELVE_WEEK_PACKAGE_SLUG, "twelve-week");
  });
});
