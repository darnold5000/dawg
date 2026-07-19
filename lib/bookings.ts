import { z } from "zod";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
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

const bookingFieldsSchema = z.object({
  sessionId: z.string().min(1),
  parentFirstName: z.string().min(1).max(80),
  parentLastName: z.string().min(1).max(80),
  parentEmail: z.string().email().max(160),
  parentPhone: z.string().min(7).max(40),
  athleteFirstName: z.string().min(1).max(80),
  athleteLastName: z.string().min(1).max(80),
  athleteDob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** When set, update this athlete if it belongs to the remembered parent. */
  athleteId: z.string().uuid().optional(),
  primarySport: z.string().max(80).optional(),
  experienceLevel: z.string().max(80).optional(),
  medicalNotes: z.string().max(1000).optional(),
  customerNotes: z.string().max(1000).optional(),
  /** Required — never silently default when the session requires online payment. */
  paymentMethod: z.enum(["stripe", "pay_at_facility"], {
    error: "Please select a payment method (Pay online or Pay at facility).",
  }),
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

  return body;
}, bookingFieldsSchema);

export type BookingInput = z.infer<typeof bookingFieldsSchema>;

export const waitlistSchema = z.object({
  sessionId: z.string().min(1),
  parentName: z.string().min(1).max(120),
  athleteName: z.string().min(1).max(120),
  email: z.string().email().max(160),
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
  supabase: ReturnType<typeof createServiceClient>,
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
      .eq("parent_id", parentId)
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
    .eq("parent_id", parentId);

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
    .insert({ parent_id: parentId, ...athletePatch })
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
  const paymentMethod = input.paymentMethod as PaymentMethod;

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

  const supabase = createServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from(DAWG_TABLES.sessions)
    .select("*")
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

  if (session.status !== "published" && session.status !== "full") {
    return {
      ok: false,
      error: "This session is not available for booking.",
      code: "SESSION_NOT_BOOKABLE",
    };
  }

  const requirement = session.payment_requirement as string;
  if (
    paymentMethod === "stripe" &&
    requirement !== "pay_online" &&
    requirement !== "online_or_facility"
  ) {
    return {
      ok: false,
      error: "Online payment is not available for this session.",
      code: "ONLINE_PAYMENT_NOT_ALLOWED",
    };
  }
  if (
    paymentMethod === "pay_at_facility" &&
    requirement !== "pay_at_facility" &&
    requirement !== "online_or_facility"
  ) {
    return {
      ok: false,
      error: "Pay at facility is not available for this session.",
      code: "FACILITY_PAYMENT_NOT_ALLOWED",
    };
  }

  let parentId: string;
  const { data: existingParent } = await supabase
    .from(DAWG_TABLES.parents)
    .select("id")
    .ilike("email", input.parentEmail)
    .maybeSingle();

  if (existingParent) {
    parentId = existingParent.id;
    await supabase
      .from(DAWG_TABLES.parents)
      .update({
        first_name: input.parentFirstName,
        last_name: input.parentLastName,
        phone: input.parentPhone,
      })
      .eq("id", parentId);
  } else {
    const { data: parent, error: parentError } = await supabase
      .from(DAWG_TABLES.parents)
      .insert({
        first_name: input.parentFirstName,
        last_name: input.parentLastName,
        email: input.parentEmail,
        phone: input.parentPhone,
      })
      .select("*")
      .single();
    if (parentError || !parent) {
      return { ok: false, error: "Could not save parent information." };
    }
    parentId = parent.id;
  }

  const { athlete, error: athleteError } = await upsertAthleteForParent(
    supabase,
    parentId,
    input,
  );

  if (athleteError || !athlete) {
    return { ok: false, error: "Could not save athlete information." };
  }

  const confirmation = generateConfirmationNumber();
  const paymentStatus =
    paymentMethod === "stripe" ? "pending" : "unpaid";

  const { data: booking, error: bookingError } = await supabase.rpc(
    "dawg_try_create_booking",
    {
      p_session_id: input.sessionId,
      p_parent_id: parentId,
      p_athlete_id: athlete.id,
      p_confirmation_number: confirmation,
      p_amount_due_cents: session.price_cents,
      p_payment_status: paymentStatus,
      p_payment_method: paymentMethod,
      p_customer_notes: input.customerNotes || null,
      p_waiver_acknowledged_at: agreementsAt,
      p_media_consent: input.mediaConsent,
      p_hold_minutes: 15,
    },
  );

  if (bookingError || !booking) {
    const message = bookingError?.message ?? "";
    if (message.includes("SESSION_FULL")) {
      return {
        ok: false,
        error: "This session is full. You can join the waitlist.",
        code: "SESSION_FULL",
      };
    }
    if (message.includes("ONLINE_PAYMENT_NOT_ALLOWED")) {
      return {
        ok: false,
        error: "Online payment is not available for this session.",
        code: "ONLINE_PAYMENT_NOT_ALLOWED",
      };
    }
    if (message.includes("FACILITY_PAYMENT_NOT_ALLOWED")) {
      return {
        ok: false,
        error: "Pay at facility is not available for this session.",
        code: "FACILITY_PAYMENT_NOT_ALLOWED",
      };
    }
    return {
      ok: false,
      error: "Could not complete booking. Please try again.",
      code: "BOOKING_FAILED",
    };
  }

  const created = booking as Booking;

  await supabase
    .from(DAWG_TABLES.bookings)
    .update({
      agreements_version: CURRENT_AGREEMENTS_VERSION,
      agreements_accepted_at: agreementsAt,
    })
    .eq("id", created.id);

  let remembered = false;
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

  // Pay-at-facility: send confirmation immediately (one-shot).
  // Stripe: wait for verified payment webhook before emailing.
  if (paymentMethod === "pay_at_facility") {
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
          amountDueCents: Number(session.price_cents),
          paymentMethod: "pay_at_facility",
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
        paymentMethod: "pay_at_facility",
        amountDueCents: Number(session.price_cents),
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
    requiresCheckout: paymentMethod === "stripe",
    parentId,
    remembered,
  };
}

export async function joinWaitlist(
  raw: WaitlistInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const input = waitlistSchema.parse(raw);

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true };
  }

  const supabase = createServiceClient();
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
