import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import type { Booking, BookingWithRelations } from "@/lib/types/database";
import { retrieveCheckoutSession } from "./webhook-handlers";

const REL_SELECT = `
  *,
  session:dawg_sessions (*),
  parent:dawg_parents (*),
  athlete:dawg_athletes (*)
`;

export async function getBookingByIdAndToken(
  bookingId: string,
  token: string,
): Promise<BookingWithRelations | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.bookings)
    .select(REL_SELECT)
    .eq("id", bookingId)
    .eq("confirmation_token", token)
    .maybeSingle();
  return (data as BookingWithRelations) ?? null;
}

export async function getBookingByCheckoutSessionId(
  checkoutSessionId: string,
  token?: string,
): Promise<BookingWithRelations | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createServiceClient();
  let query = supabase
    .from(DAWG_TABLES.bookings)
    .select(REL_SELECT)
    .eq("stripe_checkout_session_id", checkoutSessionId);

  if (token) {
    query = query.eq("confirmation_token", token);
  }

  const { data } = await query.maybeSingle();
  if (data) return data as BookingWithRelations;

  // Fallback: Stripe metadata if local attach raced
  const session = await retrieveCheckoutSession(checkoutSessionId);
  const bookingId = session?.metadata?.bookingId;
  const metaToken = session?.metadata?.confirmationToken;
  if (!bookingId) return null;
  if (token && metaToken && token !== metaToken) return null;

  return getBookingByIdAndToken(bookingId, token || metaToken || "");
}

export function isHoldActive(booking: Booking): boolean {
  if (booking.status !== "pending") return false;
  if (!booking.booking_expires_at) return true;
  return new Date(booking.booking_expires_at).getTime() > Date.now();
}

export async function expireStalePendingBookings(): Promise<number> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return 0;
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc(
    "dawg_expire_stale_pending_bookings",
  );
  if (error) {
    console.error("expire stale bookings", error);
    return 0;
  }
  return typeof data === "number" ? data : 0;
}
