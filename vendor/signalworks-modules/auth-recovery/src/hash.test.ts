import { describe, expect, it } from "vitest";

import {
  messageForAuthHashError,
  parseHashAuthError,
  parseHashSessionTokens,
  safeAuthNextPath,
} from "./hash";
import { passwordResetRedirectUrl } from "./redirect-urls";

describe("parseHashSessionTokens", () => {
  it("reads access and refresh tokens from hash", () => {
    const hash =
      "#access_token=abc&refresh_token=def&token_type=bearer&type=recovery";
    expect(parseHashSessionTokens(hash)).toEqual({
      accessToken: "abc",
      refreshToken: "def",
    });
  });
});

describe("parseHashAuthError", () => {
  it("returns null when no error", () => {
    expect(parseHashAuthError("#access_token=x")).toBeNull();
  });

  it("parses otp_expired", () => {
    const err = parseHashAuthError(
      "#error=access_denied&error_code=otp_expired",
    );
    expect(err?.errorCode).toBe("otp_expired");
    expect(messageForAuthHashError(err!)).toMatch(/expired/i);
  });
});

describe("safeAuthNextPath", () => {
  it("rejects open redirects", () => {
    expect(safeAuthNextPath("//evil.com")).toBe("/login");
    expect(safeAuthNextPath("/admin/reset-password")).toBe(
      "/admin/reset-password",
    );
  });
});

describe("passwordResetRedirectUrl", () => {
  it("supports callback + next pattern", () => {
    expect(
      passwordResetRedirectUrl({
        siteUrl: "https://example.com",
        callbackPath: "/auth/callback",
        resetPath: "/auth/reset-password",
      }),
    ).toBe(
      "https://example.com/auth/callback?next=%2Fauth%2Freset-password",
    );
  });

  it("supports direct reset path", () => {
    expect(
      passwordResetRedirectUrl({
        siteUrl: "https://example.com/",
        resetPath: "/admin/reset-password",
      }),
    ).toBe("https://example.com/admin/reset-password");
  });
});
