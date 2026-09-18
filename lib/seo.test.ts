import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { allowIndexing } from "./seo";

const KEYS = [
  "NEXT_PUBLIC_ALLOW_INDEXING",
  "VERCEL_ENV",
  "NEXT_PUBLIC_SITE_URL",
] as const;

const snapshot: Record<string, string | undefined> = {};

function rememberEnv() {
  for (const key of KEYS) snapshot[key] = process.env[key];
}

function restoreEnv() {
  for (const key of KEYS) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("allowIndexing", () => {
  rememberEnv();
  afterEach(restoreEnv);

  it("indexes Vercel production with a public site URL", () => {
    delete process.env.NEXT_PUBLIC_ALLOW_INDEXING;
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://dawgz.hiresignalworks.com";
    assert.equal(allowIndexing(), true);
  });

  it("does not index Vercel preview", () => {
    delete process.env.NEXT_PUBLIC_ALLOW_INDEXING;
    process.env.VERCEL_ENV = "preview";
    process.env.NEXT_PUBLIC_SITE_URL = "https://dawg-git-abc.vercel.app";
    assert.equal(allowIndexing(), false);
  });

  it("does not index localhost", () => {
    delete process.env.NEXT_PUBLIC_ALLOW_INDEXING;
    delete process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    assert.equal(allowIndexing(), false);
  });

  it("honors an explicit false kill switch on production", () => {
    process.env.NEXT_PUBLIC_ALLOW_INDEXING = "false";
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://dawgz.hiresignalworks.com";
    assert.equal(allowIndexing(), false);
  });
});
