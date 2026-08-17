import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FAMILY_CLAIM_COPY,
  FAMILY_LOGIN_COPY,
} from "./family-access-copy";

const CREATE_ACCOUNT_PATTERNS = [
  /create (your )?(new )?account/i,
  /set up new account/i,
  /create your dawg account/i,
];

describe("family claim copy", () => {
  it("describes access to an existing family account, not creating a new one", () => {
    const blob = [
      FAMILY_CLAIM_COPY.title,
      FAMILY_CLAIM_COPY.body,
      FAMILY_CLAIM_COPY.button,
      FAMILY_CLAIM_COPY.emailHeading,
      FAMILY_CLAIM_COPY.emailButton,
    ].join("\n");

    assert.match(blob, /existing DAWG family account/i);
    assert.match(blob, /already on file/i);
    assert.equal(FAMILY_CLAIM_COPY.button, "Set up account access");

    for (const pattern of CREATE_ACCOUNT_PATTERNS) {
      assert.equal(
        pattern.test(blob),
        false,
        `claim copy should not match ${pattern}`,
      );
    }
  });

  it("keeps later magic-link visits as normal sign-in copy", () => {
    assert.equal(FAMILY_LOGIN_COPY.title, "Continue to DAWG");
    assert.match(FAMILY_LOGIN_COPY.button, /continue/i);
    assert.equal(/create account/i.test(FAMILY_LOGIN_COPY.title), false);
  });
});
