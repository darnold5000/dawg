import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import type { Booking } from "@/lib/types/database";
import {
  hardDeleteBlockReason,
  isActiveRosterBooking,
  type BookingFinancialSnapshot,
} from "@/lib/booking-roster";

export {
  canHardDeleteBooking,
  hardDeleteBlockReason,
  isActiveRosterBooking,
  REMOVE_FROM_SESSION_CONFIRMATION,
  type BookingFinancialSnapshot,
} from "@/lib/booking-roster";

async function maybeReopenSession(
  supabase: ReturnType<typeof createTrainingServiceClient>,
  sessionId: string,
) {
  const { data: session } = await supabase
    .from(DAWG_TABLES.sessions)
    .select("id, status, capacity")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.status !== "full") return;

  const { data: rows } = await supabase
    .from(DAWG_TABLES.bookings)
    .select("status, booking_expires_at")
    .eq("session_id", sessionId);

  const active = (rows ?? []).filter((row) => isActiveRosterBooking(row)).length;
  if (active < Number(session.capacity)) {
    await supabase
      .from(DAWG_TABLES.sessions)
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("status", "full");
  }
}

export async function cancelAdminBooking(
  bookingId: string,
): Promise<
  | { ok: true; booking: Booking }
  | { ok: false; error: string; code?: string }
> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable", code: "NO_DB" };
  }

  const supabase = createTrainingServiceClient();
  const { data: existing } = await supabase
    .from(DAWG_TABLES.bookings)
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Booking not found", code: "NOT_FOUND" };
  }

  if (existing.status === "cancelled") {
    return { ok: true, booking: existing as Booking };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(DAWG_TABLES.bookings)
    .update({
      status: "cancelled",
      attendance_status: "cancelled",
      cancelled_at: now,
      updated_at: now,
    })
    .eq("id", bookingId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Could not cancel booking",
      code: "CANCEL_FAILED",
    };
  }

  await maybeReopenSession(supabase, existing.session_id);
  return { ok: true, booking: data as Booking };
}

export async function removeAdminBookingFromSession(
  bookingId: string,
): Promise<
  | { ok: true }
  | { ok: false; error: string; code?: string }
> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable", code: "NO_DB" };
  }

  const supabase = createTrainingServiceClient();
  const { data: existing } = await supabase
    .from(DAWG_TABLES.bookings)
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Booking not found", code: "NOT_FOUND" };
  }

  const [{ count: redemptionCount }, { count: txCount }] = await Promise.all([
    supabase
      .from(DAWG_TABLES.packageRedemptions)
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId),
    supabase
      .from(DAWG_TABLES.paymentTransactions)
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId),
  ]);

  const block = hardDeleteBlockReason(existing as BookingFinancialSnapshot, {
    hasRedemption: (redemptionCount ?? 0) > 0,
    hasPaymentTransaction: (txCount ?? 0) > 0,
  });
  if (block) {
    return { ok: false, error: block, code: "NOT_REMOVABLE" };
  }

  const sessionId = existing.session_id as string;
  const { error } = await supabase
    .from(DAWG_TABLES.bookings)
    .delete()
    .eq("id", bookingId);

  if (error) {
    return {
      ok: false,
      error: error.message ?? "Could not remove booking",
      code: "DELETE_FAILED",
    };
  }

  await maybeReopenSession(supabase, sessionId);
  return { ok: true };
}
