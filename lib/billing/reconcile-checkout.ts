/**
 * Confirm a DAWG booking from a paid Stripe Checkout session.
 * Used by the webhook and as a fallback when the webhook is delayed/missing.
 */
import type Stripe from "stripe";
import {
  confirmPaidBooking,
  markConfirmationEmailSent,
} from "@/lib/billing/adapter";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe/server";
import {
  sendBookingConfirmation,
  sendStaffBookingNotification,
} from "@/lib/email";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import type { Booking } from "@/lib/types/database";

function bookingIdFromMetadata(
  meta: Stripe.Metadata | null | undefined,
): string | null {
  const id = meta?.bookingId ?? meta?.booking_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

async function loadBooking(bookingId: string): Promise<Booking | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.bookings)
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  return (data as Booking) ?? null;
}

async function sendConfirmationOnce(bookingId: string): Promise<void> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.bookings)
    .select(
      `
      *,
      session:dawg_sessions (
        title, session_date, start_time, end_time, location_address, trainer_id
      ),
      parent:dawg_parents ( first_name, last_name, email, phone ),
      athlete:dawg_athletes ( first_name, last_name )
    `,
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!data) return;
  const booking = data as Booking & {
    session: {
      title: string;
      session_date: string;
      start_time: string;
      end_time: string;
      location_address: string | null;
      trainer_id: string | null;
    };
    parent: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
    athlete: { first_name: string; last_name: string };
  };

  if (booking.confirmation_email_sent_at) return;

  let coachName: string | null = null;
  if (booking.session.trainer_id) {
    const { data: trainer } = await supabase
      .from(DAWG_TABLES.trainers)
      .select("name")
      .eq("id", booking.session.trainer_id)
      .maybeSingle();
    coachName = trainer?.name ?? null;
  }

  await sendBookingConfirmation({
    booking,
    parentEmail: booking.parent.email,
    parentName: `${booking.parent.first_name} ${booking.parent.last_name}`,
    athleteName: `${booking.athlete.first_name} ${booking.athlete.last_name}`,
    sessionTitle: booking.session.title,
    sessionDate: booking.session.session_date,
    startTime: booking.session.start_time,
    endTime: booking.session.end_time,
    location: booking.session.location_address,
    coachName,
    amountDueCents: booking.amount_due_cents,
    amountPaidCents: booking.amount_paid_cents,
    paymentMethod: "stripe",
  });

  await sendStaffBookingNotification({
    booking,
    parentEmail: booking.parent.email,
    parentName: `${booking.parent.first_name} ${booking.parent.last_name}`,
    parentPhone: booking.parent.phone,
    athleteName: `${booking.athlete.first_name} ${booking.athlete.last_name}`,
    sessionTitle: booking.session.title,
    sessionDate: booking.session.session_date,
    startTime: booking.session.start_time,
    paymentStatus: "paid",
    paymentMethod: "stripe",
    amountDueCents: booking.amount_due_cents,
  });

  await markConfirmationEmailSent(bookingId);
}

/** Apply a retrieved Checkout.Session if Stripe reports it paid. */
export async function applyPaidCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ bookingId: string; confirmed: boolean }> {
  const bookingId =
    bookingIdFromMetadata(session.metadata) ??
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null);

  if (!bookingId) {
    throw new Error("Missing bookingId on Checkout session");
  }

  const booking = await loadBooking(bookingId);
  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  if (booking.payment_status === "paid" && booking.status === "confirmed") {
    return { bookingId, confirmed: true };
  }

  const amountTotal = session.amount_total ?? 0;
  const currency = (session.currency ?? "usd").toLowerCase();

  if (currency !== (booking.currency || "usd").toLowerCase()) {
    throw new Error(
      `Currency mismatch: stripe=${currency} booking=${booking.currency}`,
    );
  }

  if (booking.amount_due_cents > 0 && amountTotal < booking.amount_due_cents) {
    throw new Error(
      `Amount mismatch: paid=${amountTotal} due=${booking.amount_due_cents}`,
    );
  }

  if (session.payment_status !== "paid") {
    return { bookingId, confirmed: false };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer && !session.customer.deleted
        ? session.customer.id
        : null;

  const result = await confirmPaidBooking({
    bookingId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeCustomerId: customerId,
    amountPaidCents: amountTotal,
    currency,
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  if (!result.data.emailAlreadySent) {
    try {
      await sendConfirmationOnce(bookingId);
    } catch (err) {
      console.error("[reconcile] confirmation email failed:", err);
    }
  }

  return { bookingId, confirmed: true };
}

/**
 * Fetch Checkout session from Stripe and confirm the booking if paid.
 * Safe to call repeatedly (idempotent once paid).
 */
export async function reconcileCheckoutSession(input: {
  checkoutSessionId?: string | null;
  bookingId?: string | null;
}): Promise<{ ok: true; confirmed: boolean; bookingId?: string } | { ok: false; error: string }> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe is not configured" };
  }
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, error: "Stripe unavailable" };
  }

  let checkoutSessionId = input.checkoutSessionId?.trim() || null;

  if (!checkoutSessionId && input.bookingId) {
    const booking = await loadBooking(input.bookingId);
    checkoutSessionId = booking?.stripe_checkout_session_id ?? null;
  }

  if (!checkoutSessionId) {
    return { ok: false, error: "No Stripe Checkout session to reconcile" };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    const applied = await applyPaidCheckoutSession(session);
    return {
      ok: true,
      confirmed: applied.confirmed,
      bookingId: applied.bookingId,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not reconcile Checkout session";
    console.error("[reconcile]", message);
    return { ok: false, error: message };
  }
}
