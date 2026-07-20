import { NextResponse } from "next/server";
import { z } from "zod";
import { createBookingCheckout } from "@/lib/billing/checkout";
import {
  getBookingByIdAndToken,
  isHoldActive,
} from "@/lib/billing/booking-lookup";
import {
  bookingCancelUrl,
  bookingSuccessUrl,
} from "@/lib/billing/site-url";
import { requireFamilySessionApi } from "@/lib/family-auth";

const bodySchema = z.object({
  token: z.string().uuid(),
});

/** Retry Stripe Checkout while the DAWG hold is still active. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  try {
    const parsed = bodySchema.parse(await request.json());
    const booking = await getBookingByIdAndToken(bookingId, parsed.token);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!isHoldActive(booking)) {
      return NextResponse.json(
        {
          error: "This payment hold has expired. Please book again from the schedule.",
          code: "EXPIRED",
        },
        { status: 410 },
      );
    }

    if (booking.payment_method !== "stripe") {
      return NextResponse.json(
        { error: "This booking is not an online payment" },
        { status: 400 },
      );
    }

    const family = await requireFamilySessionApi();
    if (family instanceof NextResponse) {
      return NextResponse.json(
        { error: "Sign in to continue payment.", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    if (booking.parent_id && booking.parent_id !== family.parentId) {
      return NextResponse.json(
        { error: "This booking belongs to another account." },
        { status: 403 },
      );
    }

    const checkout = await createBookingCheckout({
      bookingId,
      successUrl: bookingSuccessUrl({
        bookingId,
        token: booking.confirmation_token,
      }),
      cancelUrl: bookingCancelUrl({
        bookingId,
        token: booking.confirmation_token,
      }),
    });

    if (!checkout.ok) {
      return NextResponse.json(
        { error: checkout.error, code: checkout.code },
        { status: 400 },
      );
    }

    return NextResponse.json({
      checkoutUrl: checkout.data.url,
      checkoutSessionId: checkout.data.sessionId,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
