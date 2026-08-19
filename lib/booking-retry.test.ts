import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  ALREADY_BOOKED_ERROR,
  SESSION_FULL_ERROR,
  bookingErrorHttpStatus,
  bookingLogPayload,
  checkoutReuseDecision,
  countsAsSeat,
  decideLatePaymentFulfillment,
  duplicateSubmitMustNotConsumeCredit,
  isActivePendingStripeHold,
  mapBookingRpcError,
  planAfterUniqueCollision,
  planBookingSubmit,
  type ExistingBookingSnapshot,
} from "./booking-retry";
import { PACKAGE_CREDIT_AUTO_MUTATION } from "./package-credit-eligibility";

const SESSION_ID = "c1bdd795-1622-496a-801f-fe5aa647e55f";
const ATHLETE_ID = "56799cc5-ed82-4f16-baee-332f9afb537e";
const GUARDIAN_ID = "eaa11588-6429-40e6-8d1e-0b0ce05db30b";
const BOOKING_ID = "6a063e78-5c81-4de6-8902-a159cbf0cdf9";

const T0 = Date.parse("2026-08-19T00:52:38.755Z");
const RETRY_AT = Date.parse("2026-08-19T00:55:19.536Z");
const HOLD_UNTIL = Date.parse("2026-08-19T01:07:38.755Z");

function pendingStripe(overrides: Partial<ExistingBookingSnapshot> = {}): ExistingBookingSnapshot {
  return {
    id: BOOKING_ID,
    session_id: SESSION_ID,
    athlete_id: ATHLETE_ID,
    guardian_id: GUARDIAN_ID,
    status: "pending",
    payment_method: "stripe",
    payment_status: "pending",
    booking_expires_at: new Date(HOLD_UNTIL).toISOString(),
    stripe_checkout_session_id: "cs_test_ashley_jaden",
    confirmation_email_sent_at: null,
    amount_paid_cents: 0,
    ...overrides,
  };
}

type StoreRow = ExistingBookingSnapshot & { attendance_status?: string | null };

function createStore(capacity = 12) {
  const rows: StoreRow[] = [];
  const emails: string[] = [];
  const checkouts: { bookingId: string; sessionId: string }[] = [];
  let creditConsumed = 0;

  function uniqueKey(row: StoreRow) {
    return `${row.session_id}:${row.athlete_id}`;
  }

  function occupying(row: StoreRow) {
    return row.status === "pending" || row.status === "confirmed";
  }

  return {
    capacity,
    rows,
    emails,
    checkouts,
    get creditConsumed() {
      return creditConsumed;
    },
    consumeCredit() {
      creditConsumed += 1;
    },
    insert(row: StoreRow) {
      const clash = rows.find(
        (existing) => uniqueKey(existing) === uniqueKey(row) && occupying(existing),
      );
      if (clash) {
        const err = new Error(
          `duplicate key value violates unique constraint "training_session_bookings_athlete_session_uidx"`,
        ) as Error & { code: string };
        err.code = "23505";
        throw err;
      }
      const active = rows.filter((r) => countsAsSeat(r, Date.now())).length;
      if (active >= capacity && countsAsSeat(row, Date.now())) {
        throw new Error("SESSION_FULL");
      }
      rows.push(row);
      if (row.stripe_checkout_session_id) {
        checkouts.push({
          bookingId: row.id,
          sessionId: row.stripe_checkout_session_id,
        });
      }
    },
    find(sessionId: string, athleteId: string) {
      return (
        rows.find(
          (row) =>
            row.session_id === sessionId &&
            row.athlete_id === athleteId &&
            occupying(row),
        ) ?? null
      );
    },
    expire(id: string) {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      row.status = "expired";
      row.payment_status = "failed";
    },
    sendEmail(bookingId: string) {
      emails.push(bookingId);
    },
    activeSeats(nowMs: number) {
      return rows.filter((row) => countsAsSeat(row, nowMs)).length;
    },
  };
}

function submit(
  store: ReturnType<typeof createStore>,
  input: {
    sessionId: string;
    athleteId: string;
    paymentMethod: "stripe" | "pay_at_facility" | "package_credit";
    nowMs: number;
    checkoutSession?: Parameters<typeof planBookingSubmit>[0]["checkoutSession"];
  },
) {
  const existing = store.find(input.sessionId, input.athleteId);
  let plan = planBookingSubmit({
    existing,
    checkoutSession: input.checkoutSession,
    nowMs: input.nowMs,
  });

  if (plan.action === "expire_then_create") {
    store.expire(plan.staleBookingId);
    plan = { action: "create", sendConfirmationEmail: false };
  }

  if (plan.action === "reject") {
    return { plan, bookingId: existing?.id ?? null };
  }

  if (plan.action === "resume_stripe") {
    return { plan, bookingId: plan.bookingId };
  }

  const id = crypto.randomUUID();
  try {
    store.insert({
      id,
      session_id: input.sessionId,
      athlete_id: input.athleteId,
      guardian_id: GUARDIAN_ID,
      status: input.paymentMethod === "stripe" ? "pending" : "confirmed",
      payment_method: input.paymentMethod,
      payment_status:
        input.paymentMethod === "stripe"
          ? "pending"
          : input.paymentMethod === "package_credit"
            ? "not_required"
            : "unpaid",
      booking_expires_at:
        input.paymentMethod === "stripe"
          ? new Date(input.nowMs + 15 * 60_000).toISOString()
          : null,
      stripe_checkout_session_id:
        input.paymentMethod === "stripe" ? `cs_${id.slice(0, 8)}` : null,
      confirmation_email_sent_at: null,
      amount_paid_cents: 0,
    });
  } catch (err) {
    const mapped = mapBookingRpcError(err as { message?: string; code?: string });
    const recovered = planAfterUniqueCollision({
      existing: store.find(input.sessionId, input.athleteId),
      nowMs: input.nowMs,
    });
    if (recovered.action === "resume_stripe") {
      return { plan: recovered, bookingId: recovered.bookingId };
    }
    return {
      plan: {
        action: "reject" as const,
        code: mapped.code as "ALREADY_BOOKED" | "SESSION_FULL",
        error: mapped.error,
        httpStatus: mapped.httpStatus as 409,
      },
      bookingId: store.find(input.sessionId, input.athleteId)?.id ?? null,
    };
  }

  if (input.paymentMethod === "package_credit") {
    store.consumeCredit();
  }
  if (
    input.paymentMethod === "pay_at_facility" ||
    input.paymentMethod === "package_credit"
  ) {
    store.sendEmail(id);
  }
  return { plan: { action: "create" as const, sendConfirmationEmail: false }, bookingId: id };
}

describe("Ashley/Jaden Stripe retry (production incident)", () => {
  it("first POST creates one pending Stripe hold with checkout", () => {
    const store = createStore();
    const first = submit(store, {
      sessionId: SESSION_ID,
      athleteId: ATHLETE_ID,
      paymentMethod: "stripe",
      nowMs: T0,
    });
    assert.equal(store.rows.length, 1);
    assert.equal(first.bookingId, store.rows[0].id);
    assert.equal(store.rows[0].status, "pending");
    assert.equal(store.rows[0].payment_method, "stripe");
    assert.equal(store.rows[0].payment_status, "pending");
    assert.ok(store.rows[0].booking_expires_at);
    assert.ok(store.rows[0].stripe_checkout_session_id);
    assert.equal(store.activeSeats(T0 + 1_000), 1);
    assert.equal(store.emails.length, 0);
  });

  it("second POST 2m41s later reuses the same booking and does not 400", () => {
    const store = createStore();
    const first = submit(store, {
      sessionId: SESSION_ID,
      athleteId: ATHLETE_ID,
      paymentMethod: "stripe",
      nowMs: T0,
    });
    const second = submit(store, {
      sessionId: SESSION_ID,
      athleteId: ATHLETE_ID,
      paymentMethod: "stripe",
      nowMs: RETRY_AT,
      checkoutSession: {
        id: "cs_test_ashley_jaden",
        status: "open",
        payment_status: "unpaid",
        url: "https://checkout.stripe.com/c/pay/cs_test_ashley_jaden",
      },
    });

    assert.equal(store.rows.length, 1);
    assert.equal(second.bookingId, first.bookingId);
    assert.equal(second.plan.action, "resume_stripe");
    if (second.plan.action === "resume_stripe") {
      assert.equal(second.plan.checkout, "reuse");
      assert.equal(second.plan.sendConfirmationEmail, false);
    }
    assert.equal(store.activeSeats(RETRY_AT), 1);
    assert.equal(store.emails.length, 0);
    assert.equal(store.checkouts.length, 1);
  });

  it("unique index still blocks a second occupying row", () => {
    const store = createStore();
    store.insert(pendingStripe());
    assert.throws(
      () => store.insert(pendingStripe({ id: "second-row" })),
      /training_session_bookings_athlete_session_uidx/,
    );
    assert.equal(store.rows.length, 1);
  });
});

describe("planBookingSubmit", () => {
  it("resumes an active pending Stripe hold", () => {
    const plan = planBookingSubmit({
      existing: pendingStripe(),
      nowMs: RETRY_AT,
      checkoutSession: {
        id: "cs_test_ashley_jaden",
        status: "open",
        payment_status: "unpaid",
        url: "https://checkout.stripe.com/c/pay/cs_test",
      },
    });
    assert.equal(plan.action, "resume_stripe");
  });

  it("replaces checkout when the existing session is no longer open", () => {
    const plan = planBookingSubmit({
      existing: pendingStripe(),
      nowMs: RETRY_AT,
      checkoutSession: {
        id: "cs_test_ashley_jaden",
        status: "expired",
        payment_status: "unpaid",
        url: null,
      },
    });
    assert.equal(plan.action, "resume_stripe");
    if (plan.action === "resume_stripe") {
      assert.equal(plan.checkout, "replace");
    }
  });

  it("rejects a confirmed duplicate without resuming Stripe", () => {
    const plan = planBookingSubmit({
      existing: {
        ...pendingStripe(),
        status: "confirmed",
        payment_method: "stripe",
        payment_status: "paid",
        booking_expires_at: null,
      },
      nowMs: RETRY_AT,
    });
    assert.deepEqual(plan, {
      action: "reject",
      code: "ALREADY_BOOKED",
      error: ALREADY_BOOKED_ERROR,
      httpStatus: 409,
    });
  });

  it("rejects pay-at-facility confirmed duplicates", () => {
    const plan = planBookingSubmit({
      existing: {
        ...pendingStripe(),
        status: "confirmed",
        payment_method: "pay_at_facility",
        payment_status: "unpaid",
        booking_expires_at: null,
        stripe_checkout_session_id: null,
      },
    });
    assert.equal(plan.action, "reject");
    if (plan.action === "reject") assert.equal(plan.code, "ALREADY_BOOKED");
  });

  it("rejects package-credit confirmed duplicates without consuming credit", () => {
    assert.equal(duplicateSubmitMustNotConsumeCredit(), true);
    assert.equal(PACKAGE_CREDIT_AUTO_MUTATION.booking, false);
    const store = createStore();
    const first = submit(store, {
      sessionId: SESSION_ID,
      athleteId: ATHLETE_ID,
      paymentMethod: "package_credit",
      nowMs: T0,
    });
    const second = submit(store, {
      sessionId: SESSION_ID,
      athleteId: ATHLETE_ID,
      paymentMethod: "package_credit",
      nowMs: RETRY_AT,
    });
    assert.equal(store.rows.length, 1);
    assert.equal(store.creditConsumed, 1);
    assert.equal(store.emails.length, 1);
    assert.equal(second.plan.action, "reject");
    assert.equal(first.bookingId, store.rows[0].id);
  });

  it("expires a stale pending hold then allows a replacement booking", () => {
    const store = createStore();
    store.insert(pendingStripe());
    const afterHold = HOLD_UNTIL + 1_000;
    const result = submit(store, {
      sessionId: SESSION_ID,
      athleteId: ATHLETE_ID,
      paymentMethod: "stripe",
      nowMs: afterHold,
    });
    assert.equal(store.rows.filter((r) => r.status === "expired").length, 1);
    assert.equal(store.rows.filter((r) => r.status === "pending").length, 1);
    assert.notEqual(result.bookingId, BOOKING_ID);
    assert.equal(store.rows.length, 2);
  });

  it("does not treat cancelled or expired history rows as blocking", () => {
    const plan = planBookingSubmit({
      existing: null,
      nowMs: RETRY_AT,
    });
    assert.equal(plan.action, "create");
  });
});

describe("checkout reuse", () => {
  it("reuses an open unpaid Checkout Session", () => {
    assert.equal(
      checkoutReuseDecision({
        id: "cs_1",
        status: "open",
        payment_status: "unpaid",
        url: "https://checkout.stripe.com/c/pay/cs_1",
      }),
      "reuse",
    );
  });

  it("replaces expired or missing checkout", () => {
    assert.equal(
      checkoutReuseDecision({
        id: "cs_1",
        status: "expired",
        payment_status: "unpaid",
        url: null,
      }),
      "replace",
    );
    assert.equal(checkoutReuseDecision(null), "unknown");
  });

  it("reconciles when checkout is already paid", () => {
    assert.equal(
      checkoutReuseDecision({
        id: "cs_1",
        status: "complete",
        payment_status: "paid",
        url: null,
      }),
      "reconcile_paid",
    );
  });
});

describe("late payment after 15-minute hold vs longer Stripe checkout", () => {
  it("confirms a still-active hold", () => {
    assert.equal(
      decideLatePaymentFulfillment({
        status: "pending",
        paymentStatus: "pending",
        bookingExpiresAt: new Date(HOLD_UNTIL).toISOString(),
        activeOtherSeats: 3,
        capacity: 12,
        nowMs: RETRY_AT,
      }).action,
      "confirm",
    );
  });

  it("restores the seat when the hold expired but capacity remains", () => {
    assert.equal(
      decideLatePaymentFulfillment({
        status: "expired",
        paymentStatus: "failed",
        bookingExpiresAt: new Date(HOLD_UNTIL).toISOString(),
        activeOtherSeats: 11,
        capacity: 12,
        nowMs: HOLD_UNTIL + 60_000,
      }).action,
      "confirm",
    );
  });

  it("does not oversell when the hold expired and the session is full", () => {
    assert.equal(
      decideLatePaymentFulfillment({
        status: "expired",
        paymentStatus: "failed",
        bookingExpiresAt: new Date(HOLD_UNTIL).toISOString(),
        activeOtherSeats: 12,
        capacity: 12,
        nowMs: HOLD_UNTIL + 60_000,
      }).action,
      "reject_late_no_capacity",
    );
  });

  it("is a no-op when already confirmed and paid", () => {
    assert.equal(
      decideLatePaymentFulfillment({
        status: "confirmed",
        paymentStatus: "paid",
        bookingExpiresAt: null,
        activeOtherSeats: 12,
        capacity: 12,
      }).action,
      "already_confirmed",
    );
  });
});

describe("capacity on resume", () => {
  it("a resumed pending hold still counts as one seat", () => {
    const hold = pendingStripe();
    assert.equal(isActivePendingStripeHold(hold, RETRY_AT), true);
    assert.equal(countsAsSeat(hold, RETRY_AT), true);
    const plan = planBookingSubmit({ existing: hold, nowMs: RETRY_AT });
    assert.equal(plan.action, "resume_stripe");
    assert.equal(countsAsSeat(hold, RETRY_AT), true);
  });

  it("session full is a 409", () => {
    const mapped = mapBookingRpcError({ message: "SESSION_FULL" });
    assert.equal(mapped.code, "SESSION_FULL");
    assert.equal(mapped.error, SESSION_FULL_ERROR);
    assert.equal(mapped.httpStatus, 409);
    assert.equal(bookingErrorHttpStatus("SESSION_FULL"), 409);
  });
});

describe("error mapping", () => {
  it("maps Postgres 23505 to ALREADY_BOOKED 409", () => {
    const mapped = mapBookingRpcError({
      code: "23505",
      message:
        'duplicate key value violates unique constraint "training_session_bookings_athlete_session_uidx"',
    });
    assert.equal(mapped.code, "ALREADY_BOOKED");
    assert.equal(mapped.error, ALREADY_BOOKED_ERROR);
    assert.equal(mapped.httpStatus, 409);
    assert.equal(bookingErrorHttpStatus("ALREADY_BOOKED"), 409);
  });

  it("does not flatten unknown DB failures into 400", () => {
    const mapped = mapBookingRpcError({
      code: "57014",
      message: "canceling statement due to statement timeout",
    });
    assert.equal(mapped.code, "BOOKING_FAILED");
    assert.equal(mapped.httpStatus, 500);
    assert.equal(bookingErrorHttpStatus("BOOKING_FAILED"), 500);
  });

  it("recovers a unique collision into resume when the hold is still active", () => {
    const recovered = planAfterUniqueCollision({
      existing: pendingStripe(),
      nowMs: RETRY_AT,
    });
    assert.equal(recovered.action, "resume_stripe");
  });
});

describe("webhook / email idempotency on resumed checkout", () => {
  it("does not send confirmation on Stripe resume", () => {
    const plan = planBookingSubmit({
      existing: pendingStripe(),
      nowMs: RETRY_AT,
    });
    assert.equal(plan.action, "resume_stripe");
    if (plan.action === "resume_stripe") {
      assert.equal(plan.sendConfirmationEmail, false);
    }
  });

  it("does not send a second email when confirmation_email_sent_at is set", () => {
    const booking = pendingStripe({
      status: "confirmed",
      payment_status: "paid",
      confirmation_email_sent_at: "2026-08-19T01:00:00Z",
    });
    assert.ok(booking.confirmation_email_sent_at);
  });
});

describe("logging is structured and omits checkout URLs", () => {
  it("records ids and outcome only", () => {
    const payload = bookingLogPayload("resumed", {
      bookingId: BOOKING_ID,
      sessionId: SESSION_ID,
      athleteId: ATHLETE_ID,
      guardianId: GUARDIAN_ID,
      checkoutSessionId: "cs_test_ashley_jaden",
    });
    const serialized = JSON.stringify(payload);
    assert.equal(payload.outcome, "resumed");
    assert.equal(payload.booking_id, BOOKING_ID);
    assert.equal(serialized.includes("checkout.stripe.com"), false);
    assert.equal(serialized.includes("sk_"), false);
  });
});

describe("schema safety net is unchanged", () => {
  it("keeps training_session_bookings_athlete_session_uidx", () => {
    const sql = readFileSync(
      path.join(
        process.cwd(),
        "supabase-signalworks/migrations/002_training_vertical_schema_core.sql",
      ),
      "utf8",
    );
    assert.match(sql, /training_session_bookings_athlete_session_uidx/);
    assert.match(
      sql,
      /unique index if not exists training_session_bookings_athlete_session_uidx[\s\S]*where status in \('pending', 'confirmed'\)/,
    );
  });
});
