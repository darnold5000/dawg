import { z } from "zod";
import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { mapBookingRow } from "@/lib/supabase/booking-map";
import { generateConfirmationNumber } from "@/lib/format";
import type { Booking, PaymentMethod } from "@/lib/types/database";
import { markConfirmationEmailSent } from "@/lib/billing/adapter";
import {
  sendBookingConfirmation,
  sendStaffBookingNotification,
  sendWaitlistConfirmation,
} from "@/lib/email";
import { CURRENT_AGREEMENTS_VERSION } from "@/lib/agreements";
import {
  deviceAgreementsSatisfied,
  refreshDeviceAgreementsIfPresent,
  rememberFamilyOnDevice,
  setFamilyDeviceCookie,
} from "@/lib/family-device";
import { athleteBookingReady } from "@/lib/intake";
import { findOrCreateParentByContact } from "@/lib/parent-account";
import { isOnlineCardPaymentEnabled } from "@/lib/billing/payment-options";
import { resolveSessionBookingPayment } from "@/lib/booking-payment-decision";
import { listActiveCreditsForParent } from "@/lib/packages";
import { isRosterCreditSession } from "@/lib/roster-credit-sessions";
import { expirePendingBooking } from "@/lib/billing/adapter";
import {
  bookingLogPayload,
  mapBookingRpcError,
  planAfterUniqueCollision,
  planBookingSubmit,
} from "@/lib/booking-retry";

const bookingFieldsSchema = z.object({
  sessionId: z.string().min(1),
  parentFirstName: z.string().min(1).max(80),
  parentLastName: z.string().min(1).max(80),
  parentEmail: z.string().email("Enter a valid email address").max(160),
  parentPhone: z.string().min(7).max(40),
  athleteFirstName: z.string().min(1).max(80),
  athleteLastName: z.string().min(1).max(80),
  athleteDob: z
    .string()
    .transform((value) => value.trim().slice(0, 10))
    .pipe(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid athlete date of birth"),
    ),
  /** When set, update this athlete if it belongs to the remembered parent. */
  athleteId: z.string().uuid().optional(),
  primarySport: z.string().max(80).optional(),
  experienceLevel: z.string().max(80).optional(),
  medicalNotes: z.string().max(1000).optional(),
  customerNotes: z.string().max(1000).optional(),
  /** Omitted for Little/Big Dawgs roster bookings — no payment step. */
  paymentMethod: z.enum(["stripe", "pay_at_facility"]).optional(),
  /**
   * Combined required agreements (guardian + booking/cancellation/privacy/waiver).
   * May be omitted when this device already accepted the current policy version.
   */
  acceptRequiredAgreements: z.boolean().optional(),
  mediaConsent: z.boolean().default(false),
  rememberFamily: z.boolean().optional(),
});

/** Map legacy multi-checkbox payloads from cached clients onto the current schema. */
export const bookingSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object") return raw;
  const body = { ...(raw as Record<string, unknown>) };

  if (body.acceptRequiredAgreements == null) {
    const legacyOk =
      body.isGuardian === true &&
      body.acceptCancellation === true &&
      body.acceptWaiver === true &&
      body.acceptTerms === true &&
      body.acceptPrivacy === true;
    if (legacyOk) body.acceptRequiredAgreements = true;
  }

  // Older clients sometimes omitted mediaConsent
  if (typeof body.mediaConsent !== "boolean") {
    body.mediaConsent = Boolean(body.mediaConsent);
  }

  // Remembered / Postgres dates may arrive as ISO timestamps
  if (typeof body.athleteDob === "string") {
    body.athleteDob = body.athleteDob.trim().slice(0, 10);
  }

  if (body.parentPhone == null) body.parentPhone = "";
  if (typeof body.parentPhone === "string") {
    body.parentPhone = body.parentPhone.trim();
  }

  return body;
}, bookingFieldsSchema);

export type BookingInput = z.infer<typeof bookingFieldsSchema>;

export const waitlistSchema = z.object({
  sessionId: z.string().min(1),
  parentName: z.string().min(1).max(120),
  athleteName: z.string().min(1).max(120),
  email: z.string().email("Enter a valid email address").max(160),
  phone: z.string().min(7).max(40),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export type BookingResult =
  | {
      ok: true;
      booking: Booking;
      demo?: boolean;
      requiresCheckout?: boolean;
      parentId?: string;
      remembered?: boolean;
      rosterCredit?: boolean;
      coveredByPackageCredit?: boolean;
      resumed?: boolean;
    }
  | { ok: false; error: string; code?: string };

function emptyBookingFields(
  partial: Partial<Booking> &
    Pick<
      Booking,
      | "id"
      | "session_id"
      | "parent_id"
      | "athlete_id"
      | "confirmation_number"
      | "status"
      | "payment_status"
      | "payment_method"
      | "amount_due_cents"
    >,
): Booking {
  const now = new Date().toISOString();
  return {
    confirmation_token: crypto.randomUUID(),
    attendance_status: "registered",
    amount_paid_cents: 0,
    amount_refunded_cents: 0,
    currency: "usd",
    stripe_customer_id: null,
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: null,
    stripe_charge_id: null,
    paid_at: null,
    refunded_at: null,
    payment_failure_message: null,
    booking_expires_at: null,
    confirmation_email_sent_at: null,
    customer_notes: null,
    internal_notes: null,
    waiver_acknowledged_at: now,
    media_consent: false,
    agreements_version: CURRENT_AGREEMENTS_VERSION,
    agreements_accepted_at: now,
    booked_at: now,
    cancelled_at: null,
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

async function upsertAthleteForParent(
  supabase: ReturnType<typeof createTrainingServiceClient>,
  parentId: string,
  input: BookingInput,
): Promise<{ athlete: { id: string } | null; error: Error | null }> {
  const athletePatch = {
    first_name: input.athleteFirstName,
    last_name: input.athleteLastName,
    date_of_birth: input.athleteDob,
    primary_sport: input.primarySport || null,
    experience_level: input.experienceLevel || null,
    medical_notes: input.medicalNotes || null,
  };

  if (input.athleteId) {
    const { data: owned } = await supabase
      .from(DAWG_TABLES.athletes)
      .select("id")
      .eq("id", input.athleteId)
      .eq("guardian_id", parentId)
      .maybeSingle();

    if (owned) {
      const { data: updated, error } = await supabase
        .from(DAWG_TABLES.athletes)
        .update(athletePatch)
        .eq("id", owned.id)
        .select("id")
        .single();
      if (!error && updated) return { athlete: updated, error: null };
    }
  }

  const { data: siblings } = await supabase
    .from(DAWG_TABLES.athletes)
    .select("id, first_name, last_name, date_of_birth")
    .eq("guardian_id", parentId);

  const match = (siblings ?? []).find(
    (a) =>
      a.first_name.trim().toLowerCase() ===
        input.athleteFirstName.trim().toLowerCase() &&
      a.last_name.trim().toLowerCase() ===
        input.athleteLastName.trim().toLowerCase() &&
      a.date_of_birth === input.athleteDob,
  );

  if (match) {
    const { data: updated, error } = await supabase
      .from(DAWG_TABLES.athletes)
      .update(athletePatch)
      .eq("id", match.id)
      .select("id")
      .single();
    if (!error && updated) return { athlete: updated, error: null };
    return { athlete: { id: match.id }, error: null };
  }

  const { data: created, error } = await supabase
    .from(DAWG_TABLES.athletes)
    .insert({ guardian_id: parentId, ...athletePatch })
    .select("id")
    .single();

  return {
    athlete: created,
    error: error ? new Error(error.message) : null,
  };
}

export async function createPublicBooking(
  raw: BookingInput,
): Promise<BookingResult> {
  const input = bookingSchema.parse(raw);

  const priorAgreementsOk = await deviceAgreementsSatisfied();
  if (!input.acceptRequiredAgreements && !priorAgreementsOk) {
    return {
      ok: false,
      error: "Please accept the required booking agreements.",
      code: "AGREEMENTS_REQUIRED",
    };
  }

  const agreementsAt = new Date().toISOString();

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const paymentMethod = (input.paymentMethod ?? "pay_at_facility") as PaymentMethod;
    const demoBooking = emptyBookingFields({
      id: crypto.randomUUID(),
      session_id: input.sessionId,
      parent_id: crypto.randomUUID(),
      athlete_id: crypto.randomUUID(),
      confirmation_number: generateConfirmationNumber(),
      status: paymentMethod === "stripe" ? "pending" : "confirmed",
      payment_method: paymentMethod,
      payment_status: paymentMethod === "stripe" ? "pending" : "unpaid",
      amount_due_cents: 0,
      customer_notes: input.customerNotes ?? null,
      internal_notes: "[DEMO] Created without Supabase",
      media_consent: input.mediaConsent,
      waiver_acknowledged_at: agreementsAt,
      agreements_version: CURRENT_AGREEMENTS_VERSION,
      agreements_accepted_at: agreementsAt,
      booking_expires_at:
        paymentMethod === "stripe"
          ? new Date(Date.now() + 15 * 60_000).toISOString()
          : null,
    });
    return {
      ok: true,
      booking: demoBooking,
      demo: true,
      requiresCheckout: paymentMethod === "stripe",
      remembered: Boolean(input.rememberFamily),
    };
  }

  const supabase = createTrainingServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from(DAWG_TABLES.sessions)
    .select("*, program:training_programs ( slug )")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    if (String(input.sessionId).startsWith("sess-")) {
      return {
        ok: false,
        error:
          "This is a demo schedule placeholder. Publish a real session in Admin → Sessions, then book from that listing.",
        code: "DEMO_SESSION",
      };
    }
    return { ok: false, error: "Session not found.", code: "SESSION_NOT_FOUND" };
  }

  const rosterCredit = isRosterCreditSession({
    program: (session.program as { slug: string } | null) ?? null,
  });

  if (session.status !== "published" && session.status !== "full") {
    return {
      ok: false,
      error: "This session is not available for booking.",
      code: "SESSION_NOT_BOOKABLE",
    };
  }

  const parentResult = await findOrCreateParentByContact({
    email: input.parentEmail,
    firstName: input.parentFirstName,
    lastName: input.parentLastName,
    phone: input.parentPhone,
  });
  if (!parentResult.ok) {
    return {
      ok: false,
      error: parentResult.error,
      code: parentResult.code,
    };
  }
  const parentId = parentResult.parent.id;

  const { athlete, error: athleteError } = await upsertAthleteForParent(
    supabase,
    parentId,
    input,
  );

  if (athleteError || !athlete) {
    return { ok: false, error: "Could not save athlete information." };
  }

  const hasIntake = await athleteBookingReady(athlete.id);
  if (!hasIntake.ready) {
    return {
      ok: false,
      error: hasIntake.needsWaiverRenewal
        ? "Please accept the updated liability waiver before booking."
        : "Please complete client intake for this athlete before booking.",
      code: hasIntake.needsWaiverRenewal
        ? "WAIVER_RENEWAL_REQUIRED"
        : "INTAKE_REQUIRED",
    };
  }

  const eligibleCredits = rosterCredit
    ? []
    : await listActiveCreditsForParent(parentId, athlete.id);
  const payment = resolveSessionBookingPayment({
    rosterCredit,
    eligibleCreditCount: eligibleCredits.length,
    requestedPaymentMethod: input.paymentMethod,
    sessionPriceCents: Number(session.price_cents),
    paymentRequirement: String(session.payment_requirement ?? ""),
    onlinePaymentEnabled: isOnlineCardPaymentEnabled(),
  });

  if (payment.error) {
    return {
      ok: false,
      error: payment.error.message,
      code: payment.error.code,
    };
  }

  const paymentMethod = payment.paymentMethod;
  const paymentStatus = payment.paymentStatus;
  const amountDueCents = payment.amountDueCents;
  const coveredByPackageCredit = payment.coveredByPackageCredit;

  console.info("[bookings] payment decision", {
    guardian_id: parentId,
    athlete_id: athlete.id,
    session_id: input.sessionId,
    eligible_credit_count: eligibleCredits.length,
    has_package_credit: coveredByPackageCredit,
    session_price_cents: Number(session.price_cents),
    payment_requirement: session.payment_requirement,
    requires_checkout: payment.requiresCheckout,
  });

  const { data: occupying } = await supabase
    .from(DAWG_TABLES.bookings)
    .select("*")
    .eq("session_id", input.sessionId)
    .eq("athlete_id", athlete.id)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();

  const occupyingRow = occupying
    ? mapBookingRow(occupying as Record<string, unknown>)
    : null;

  let retryPlan = planBookingSubmit({
    existing: occupying
      ? {
          id: String(occupying.id),
          session_id: String(occupying.session_id),
          athlete_id: String(occupying.athlete_id),
          guardian_id: String(occupying.guardian_id ?? occupying.parent_id ?? parentId),
          status: String(occupying.status),
          payment_method: occupying.payment_method as string | null,
          payment_status: String(occupying.payment_status),
          booking_expires_at: occupying.booking_expires_at ?? null,
          stripe_checkout_session_id:
            occupying.stripe_checkout_session_id ?? null,
          confirmation_email_sent_at:
            occupying.confirmation_email_sent_at ?? null,
        }
      : null,
  });

  if (retryPlan.action === "reject") {
    console.info(
      "[bookings]",
      bookingLogPayload(
        retryPlan.code === "SESSION_FULL" ? "session_full" : "already_booked",
        {
          bookingId: occupyingRow?.id,
          sessionId: input.sessionId,
          athleteId: athlete.id,
          guardianId: parentId,
        },
      ),
    );
    return {
      ok: false,
      error: retryPlan.error,
      code: retryPlan.code,
    };
  }

  if (retryPlan.action === "expire_then_create") {
    await expirePendingBooking({
      bookingId: retryPlan.staleBookingId,
      reason: "Hold expired before replacement booking",
    });
    console.info(
      "[bookings]",
      bookingLogPayload("stale_expired", {
        bookingId: retryPlan.staleBookingId,
        sessionId: input.sessionId,
        athleteId: athlete.id,
        guardianId: parentId,
        checkoutSessionId: retryPlan.expireCheckoutSessionId,
      }),
    );
    retryPlan = { action: "create", sendConfirmationEmail: false };
  }

  if (retryPlan.action === "resume_stripe" && occupyingRow) {
    console.info(
      "[bookings]",
      bookingLogPayload("resumed", {
        bookingId: occupyingRow.id,
        sessionId: input.sessionId,
        athleteId: athlete.id,
        guardianId: parentId,
        checkoutSessionId: occupyingRow.stripe_checkout_session_id,
      }),
    );
    return {
      ok: true,
      booking: occupyingRow,
      requiresCheckout: true,
      parentId,
      remembered: false,
      rosterCredit,
      coveredByPackageCredit: false,
      resumed: true,
    };
  }

  const confirmation = generateConfirmationNumber();

  const { data: booking, error: bookingError } = await supabase.rpc(
    "training_try_create_session_booking",
    {
      p_session_id: input.sessionId,
      p_guardian_id: parentId,
      p_athlete_id: athlete.id,
      p_confirmation_number: confirmation,
      p_amount_due_cents: amountDueCents,
      p_payment_status: paymentStatus,
      p_payment_method: paymentMethod,
      p_customer_notes: input.customerNotes || null,
      p_waiver_acknowledged_at: agreementsAt,
      p_media_consent: input.mediaConsent,
      p_hold_minutes: 15,
    },
  );

  if (bookingError || !booking) {
    const { data: afterCollision } = await supabase
      .from(DAWG_TABLES.bookings)
      .select("*")
      .eq("session_id", input.sessionId)
      .eq("athlete_id", athlete.id)
      .in("status", ["pending", "confirmed"])
      .maybeSingle();

    const recovered = planAfterUniqueCollision({
      existing: afterCollision
        ? {
            id: String(afterCollision.id),
            session_id: String(afterCollision.session_id),
            athlete_id: String(afterCollision.athlete_id),
            guardian_id: String(
              afterCollision.guardian_id ?? afterCollision.parent_id ?? parentId,
            ),
            status: String(afterCollision.status),
            payment_method: afterCollision.payment_method as string | null,
            payment_status: String(afterCollision.payment_status),
            booking_expires_at: afterCollision.booking_expires_at ?? null,
            stripe_checkout_session_id:
              afterCollision.stripe_checkout_session_id ?? null,
          }
        : null,
    });

    if (recovered.action === "resume_stripe" && afterCollision) {
      const resumed = mapBookingRow(afterCollision as Record<string, unknown>);
      if (resumed) {
        console.info(
          "[bookings]",
          bookingLogPayload("resumed", {
            bookingId: resumed.id,
            sessionId: input.sessionId,
            athleteId: athlete.id,
            guardianId: parentId,
            checkoutSessionId: resumed.stripe_checkout_session_id,
          }),
        );
        return {
          ok: true,
          booking: resumed,
          requiresCheckout: true,
          parentId,
          remembered: false,
          rosterCredit,
          coveredByPackageCredit: false,
          resumed: true,
        };
      }
    }

    const mapped = mapBookingRpcError(bookingError);
    if (mapped.code === "SESSION_FULL") {
      console.info(
        "[bookings]",
        bookingLogPayload("session_full", {
          sessionId: input.sessionId,
          athleteId: athlete.id,
          guardianId: parentId,
        }),
      );
    } else if (mapped.code === "ALREADY_BOOKED") {
      console.info(
        "[bookings]",
        bookingLogPayload("already_booked", {
          bookingId: afterCollision?.id ?? occupyingRow?.id,
          sessionId: input.sessionId,
          athleteId: athlete.id,
          guardianId: parentId,
        }),
      );
    } else {
      console.error(
        "[bookings] training_try_create_session_booking failed:",
        bookingError,
      );
    }
    return {
      ok: false,
      error: mapped.error,
      code: mapped.code,
    };
  }

  const created = mapBookingRow(booking as Record<string, unknown>);
  if (!created) {
    return { ok: false, error: "Could not complete booking. Please try again.", code: "BOOKING_FAILED" };
  }

  await supabase
    .from(DAWG_TABLES.bookings)
    .update({
      agreements_version: CURRENT_AGREEMENTS_VERSION,
      agreements_accepted_at: agreementsAt,
    })
    .eq("id", created.id);

  let remembered = false;
  try {
    if (input.rememberFamily) {
      const rememberedResult = await rememberFamilyOnDevice({
        parentId,
        agreementsVersion: CURRENT_AGREEMENTS_VERSION,
        mediaConsent: input.mediaConsent,
      });
      if ("token" in rememberedResult) {
        await setFamilyDeviceCookie(rememberedResult.token);
        remembered = true;
      }
    } else {
      await refreshDeviceAgreementsIfPresent({
        parentId,
        agreementsVersion: CURRENT_AGREEMENTS_VERSION,
        mediaConsent: input.mediaConsent,
      });
    }
  } catch (rememberError) {
    console.error("[bookings] remember-family side effect failed:", rememberError);
  }

  console.info(
    "[bookings]",
    bookingLogPayload("created", {
      bookingId: created.id,
      sessionId: input.sessionId,
      athleteId: athlete.id,
      guardianId: parentId,
    }),
  );

  // Confirmed roster / facility / package-credit bookings: email immediately. Stripe waits for webhook.
  if (
    paymentMethod === "pay_at_facility" ||
    paymentMethod === "package_credit"
  ) {
    const emailResults = await Promise.allSettled([
      (async () => {
        let coachName: string | null = null;
        if (session.trainer_id) {
          const { data: trainer } = await supabase
            .from(DAWG_TABLES.trainers)
            .select("name")
            .eq("id", session.trainer_id)
            .maybeSingle();
          coachName = trainer?.name ?? null;
        }
        await sendBookingConfirmation({
          booking: created,
          parentEmail: input.parentEmail,
          parentName: `${input.parentFirstName} ${input.parentLastName}`,
          athleteName: `${input.athleteFirstName} ${input.athleteLastName}`,
          sessionTitle: session.title,
          sessionDate: session.session_date,
          startTime: session.start_time,
          endTime: session.end_time,
          location: session.location_address,
          coachName,
          amountDueCents,
          paymentMethod,
          rosterOnly: rosterCredit,
        });
        await markConfirmationEmailSent(created.id);
      })(),
      sendStaffBookingNotification({
        booking: created,
        parentEmail: input.parentEmail,
        parentName: `${input.parentFirstName} ${input.parentLastName}`,
        parentPhone: input.parentPhone,
        athleteName: `${input.athleteFirstName} ${input.athleteLastName}`,
        sessionTitle: session.title,
        sessionDate: session.session_date,
        startTime: session.start_time,
        paymentStatus: created.payment_status,
        paymentMethod,
        amountDueCents,
        rosterOnly: rosterCredit,
      }),
    ]);
    for (const result of emailResults) {
      if (result.status === "rejected") {
        console.error("[bookings] confirmation email failed:", result.reason);
      }
    }
  }

  return {
    ok: true,
    booking: created,
    requiresCheckout: payment.requiresCheckout,
    parentId,
    remembered,
    rosterCredit,
    coveredByPackageCredit,
  };
}

export async function joinWaitlist(
  raw: WaitlistInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const input = waitlistSchema.parse(raw);

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true };
  }

  const supabase = createTrainingServiceClient();
  const { data: existing } = await supabase
    .from(DAWG_TABLES.waitlistEntries)
    .select("position")
    .eq("session_id", input.sessionId)
    .eq("status", "waiting")
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (existing?.[0]?.position ?? 0) + 1;

  const { error } = await supabase.from(DAWG_TABLES.waitlistEntries).insert({
    session_id: input.sessionId,
    parent_name: input.parentName,
    athlete_name: input.athleteName,
    email: input.email,
    phone: input.phone,
    status: "waiting",
    position: nextPosition,
  });

  if (error) {
    return { ok: false, error: "Could not join waitlist." };
  }

  await sendWaitlistConfirmation({
    email: input.email,
    parentName: input.parentName,
    athleteName: input.athleteName,
  });

  return { ok: true };
}
