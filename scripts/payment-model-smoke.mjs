/**
 * Local smoke checks for payment helpers (no Stripe / Supabase required).
 * Run: node scripts/payment-model-smoke.mjs
 */

function allowedPaymentMethods(requirement) {
  switch (requirement) {
    case "pay_online":
      return ["stripe"];
    case "pay_at_facility":
      return ["pay_at_facility"];
    case "online_or_facility":
      return ["stripe", "pay_at_facility"];
    default:
      return ["pay_at_facility"];
  }
}

function defaultPaymentMethod(requirement) {
  const allowed = allowedPaymentMethods(requirement);
  if (allowed.length === 1) return allowed[0];
  return null;
}

function isHoldActive(booking) {
  if (booking.status !== "pending") return false;
  if (!booking.booking_expires_at) return true;
  return new Date(booking.booking_expires_at).getTime() > Date.now();
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL", msg);
    failed += 1;
  } else {
    console.log("OK  ", msg);
  }
}

assert(
  JSON.stringify(allowedPaymentMethods("pay_online")) === '["stripe"]',
  "pay_online only shows stripe",
);
assert(
  defaultPaymentMethod("pay_online") === "stripe",
  "pay_online defaults to stripe (not facility)",
);
assert(
  defaultPaymentMethod("online_or_facility") === null,
  "online_or_facility does not silently default",
);
assert(
  defaultPaymentMethod("pay_at_facility") === "pay_at_facility",
  "facility-only defaults to facility",
);

const active = {
  status: "pending",
  booking_expires_at: new Date(Date.now() + 60_000).toISOString(),
};
const expired = {
  status: "pending",
  booking_expires_at: new Date(Date.now() - 1_000).toISOString(),
};
assert(isHoldActive(active), "active hold allows retry");
assert(!isHoldActive(expired), "expired hold rejects retry");
assert(
  !isHoldActive({ status: "confirmed", booking_expires_at: null }),
  "confirmed booking is not a hold",
);

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll payment-model smoke checks passed.");
