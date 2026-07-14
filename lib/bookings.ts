import { z } from "zod";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { generateConfirmationNumber } from "@/lib/format";
import type { Booking } from "@/lib/types/database";
import {
  sendBookingConfirmation,
  sendStaffBookingNotification,
  sendWaitlistConfirmation,
} from "@/lib/email";

export const bookingSchema = z.object({
  sessionId: z.string().min(1),
  parentFirstName: z.string().min(1).max(80),
  parentLastName: z.string().min(1).max(80),
  parentEmail: z.string().email().max(160),
  parentPhone: z.string().min(7).max(40),
  athleteFirstName: z.string().min(1).max(80),
  athleteLastName: z.string().min(1).max(80),
  athleteDob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  primarySport: z.string().max(80).optional(),
  experienceLevel: z.string().max(80).optional(),
  medicalNotes: z.string().max(1000).optional(),
  customerNotes: z.string().max(1000).optional(),
  isGuardian: z.literal(true),
  acceptCancellation: z.literal(true),
  acceptWaiver: z.literal(true),
  acceptTerms: z.literal(true),
  acceptPrivacy: z.literal(true),
  mediaConsent: z.boolean(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

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
    }
  | { ok: false; error: string; code?: string };

export async function createPublicBooking(
  raw: BookingInput,
): Promise<BookingResult> {
  const input = bookingSchema.parse(raw);

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Demo mode for local development without Supabase
    const demoBooking: Booking = {
      id: crypto.randomUUID(),
      session_id: input.sessionId,
      parent_id: crypto.randomUUID(),
      athlete_id: crypto.randomUUID(),
      confirmation_number: generateConfirmationNumber(),
      status: "confirmed",
      payment_status: "pay_at_facility",
      amount_due: 0,
      amount_paid: 0,
      stripe_checkout_session_id: null,
      stripe_payment_intent_id: null,
      customer_notes: input.customerNotes ?? null,
      internal_notes: "[DEMO] Created without Supabase",
      waiver_acknowledged_at: new Date().toISOString(),
      media_consent: input.mediaConsent,
      booked_at: new Date().toISOString(),
      cancelled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return { ok: true, booking: demoBooking, demo: true };
  }

  const supabase = createServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from(DAWG_TABLES.sessions)
    .select("*")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    return { ok: false, error: "Session not found.", code: "SESSION_NOT_FOUND" };
  }

  if (session.status !== "published" && session.status !== "full") {
    return {
      ok: false,
      error: "This session is not available for booking.",
      code: "SESSION_NOT_BOOKABLE",
    };
  }

  // Upsert-ish parent by email
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

  const { data: athlete, error: athleteError } = await supabase
    .from(DAWG_TABLES.athletes)
    .insert({
      parent_id: parentId,
      first_name: input.athleteFirstName,
      last_name: input.athleteLastName,
      date_of_birth: input.athleteDob,
      primary_sport: input.primarySport || null,
      experience_level: input.experienceLevel || null,
      medical_notes: input.medicalNotes || null,
    })
    .select("*")
    .single();

  if (athleteError || !athlete) {
    return { ok: false, error: "Could not save athlete information." };
  }

  const confirmation = generateConfirmationNumber();
  const { data: booking, error: bookingError } = await supabase.rpc(
    "dawg_try_create_booking",
    {
      p_session_id: input.sessionId,
      p_parent_id: parentId,
      p_athlete_id: athlete.id,
      p_confirmation_number: confirmation,
      p_amount_due: session.price,
      p_payment_status: "pay_at_facility",
      p_customer_notes: input.customerNotes || null,
      p_waiver_acknowledged_at: new Date().toISOString(),
      p_media_consent: input.mediaConsent,
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
    return {
      ok: false,
      error: "Could not complete booking. Please try again.",
      code: "BOOKING_FAILED",
    };
  }

  const created = booking as Booking;

  await Promise.allSettled([
    sendBookingConfirmation({
      booking: created,
      parentEmail: input.parentEmail,
      parentName: `${input.parentFirstName} ${input.parentLastName}`,
      athleteName: `${input.athleteFirstName} ${input.athleteLastName}`,
      sessionTitle: session.title,
      sessionDate: session.session_date,
      startTime: session.start_time,
      location: session.location_address,
      amountDue: Number(session.price),
    }),
    sendStaffBookingNotification({
      booking: created,
      parentEmail: input.parentEmail,
      parentName: `${input.parentFirstName} ${input.parentLastName}`,
      parentPhone: input.parentPhone,
      athleteName: `${input.athleteFirstName} ${input.athleteLastName}`,
      sessionTitle: session.title,
      sessionDate: session.session_date,
      startTime: session.start_time,
    }),
  ]);

  return { ok: true, booking: created };
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
