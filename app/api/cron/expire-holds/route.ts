import { NextResponse } from "next/server";
import { expireStalePendingBookings } from "@/lib/billing/booking-lookup";

/**
 * Expire abandoned Stripe holds (DAWG 15-minute booking_expires_at).
 * Protect with CRON_SECRET or call from Vercel Cron.
 *
 * Authorization: Authorization: Bearer <CRON_SECRET>
 * or ?secret=<CRON_SECRET>
 */
export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  if (expected && bearer !== expected && querySecret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow unauthenticated in local/dev when CRON_SECRET unset
  if (!expected && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is required in production" },
      { status: 503 },
    );
  }

  const expired = await expireStalePendingBookings();
  return NextResponse.json({ ok: true, expired });
}

export async function GET(request: Request) {
  return POST(request);
}
