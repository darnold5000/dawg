#!/usr/bin/env npx tsx
/**
 * Verifies the three account-safeguard behaviors without a live database.
 * Run: npm run test:safeguards
 */
import assert from "node:assert/strict";
import {
  normalizeEmail,
  resolvePurchaseParentId,
  verifiedCheckoutEmail,
} from "../lib/billing/verified-checkout-email";
import { evaluateLoginToken } from "../lib/family-token-verify";

function testVerifiedEmailExtraction() {
  const prefersCheckoutEntry = verifiedCheckoutEmail({
    customer_email: "prefill@example.com",
    customer_details: { email: "verified@example.com" },
  });
  assert.equal(prefersCheckoutEntry, "verified@example.com");

  const fallback = verifiedCheckoutEmail({
    customer_email: "Parent@Example.com",
  });
  assert.equal(fallback, "parent@example.com");
}

function testTypoCreatesSeparateParent() {
  const formParentId = "parent-form-typo";
  const realParentId = "parent-real-stripe";

  const reassigned = resolvePurchaseParentId({
    verifiedEmail: "jane@example.com",
    provisionalParentId: formParentId,
    parentIdForVerifiedEmail: realParentId,
  });
  assert.equal(reassigned.parentId, realParentId);
  assert.equal(reassigned.shouldReassign, true);
  assert.equal(reassigned.createsNewParent, false);

  const novel = resolvePurchaseParentId({
    verifiedEmail: "jane.typo@example.com",
    provisionalParentId: formParentId,
    parentIdForVerifiedEmail: null,
  });
  assert.equal(novel.parentId, null);
  assert.equal(novel.createsNewParent, true);

  const noWrongMerge = resolvePurchaseParentId({
    verifiedEmail: "jane.typo@example.com",
    provisionalParentId: "parent-jane-real",
    parentIdForVerifiedEmail: "parent-jane-real",
  });
  assert.equal(noWrongMerge.parentId, "parent-jane-real");
  assert.equal(noWrongMerge.shouldReassign, false);
}

function testClaimTokenExpiryAndReuse() {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();
  const now = new Date().toISOString();

  assert.deepEqual(
    evaluateLoginToken({ used_at: null, expires_at: future }, now),
    { ok: true },
  );
  assert.deepEqual(
    evaluateLoginToken({ used_at: now, expires_at: future }, now),
    { ok: false, code: "USED" },
  );
  assert.deepEqual(
    evaluateLoginToken({ used_at: null, expires_at: past }, now),
    { ok: false, code: "EXPIRED" },
  );
  assert.deepEqual(evaluateLoginToken(null, now), {
    ok: false,
    code: "INVALID",
  });
}

function testEmailNormalizationIsExact() {
  assert.equal(normalizeEmail("  A@B.COM "), "a@b.com");
  assert.notEqual(normalizeEmail("a@b.com"), normalizeEmail("a@b.co"));
}

testVerifiedEmailExtraction();
testTypoCreatesSeparateParent();
testClaimTokenExpiryAndReuse();
testEmailNormalizationIsExact();

console.log("✓ All account safeguard checks passed");
