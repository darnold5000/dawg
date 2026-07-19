import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { bookingSchema, createPublicBooking } from "@/lib/bookings";
import { createBookingCheckout } from "@/lib/billing/checkout";
import {
  bookingCancelUrl,
  bookingSuccessUrl,
} from "@/lib/billing/site-url";
import { expirePendingBooking } from "@/lib/billing/adapter";

const recent = new Map<string, number>();

function rateLimited(key: string, windowMs = 15_000): boolean {
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < windowMs) return true;
  recent.set(key, now);
  return false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bookingSchema.parse(body);
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (rateLimited(`${ip}:${parsed.parentEmail}`)) {
      return NextResponse.json(
        { error: "Please wait a moment before submitting again." },
        { status: 429 },
      );
    }

    const result = await createPublicBooking(parsed);
    if (!result.ok) {
      const status = result.code === "SESSION_FULL" ? 409 : 400;
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status },
      );
    }

    if (result.requiresCheckout && !result.demo) {
      const checkout = await createBookingCheckout({
        bookingId: result.booking.id,
        successUrl: bookingSuccessUrl({
          bookingId: result.booking.id,
          token: result.booking.confirmation_token,
        }),
        cancelUrl: bookingCancelUrl({
          bookingId: result.booking.id,
          token: result.booking.confirmation_token,
        }),
      });

      if (!checkout.ok) {
        await expirePendingBooking({
          bookingId: result.booking.id,
          reason: checkout.error,
        });
        return NextResponse.json(
          {
            error: checkout.error || "Could not start online payment.",
            code: checkout.code ?? "CHECKOUT_FAILED",
          },
          { status: 400 },
        );
      }

      return NextResponse.json({
        confirmationNumber: result.booking.confirmation_number,
        confirmationToken: result.booking.confirmation_token,
        bookingId: result.booking.id,
        checkoutUrl: checkout.data.url,
        checkoutSessionId: checkout.data.sessionId,
        requiresCheckout: true,
      });
    }

    return NextResponse.json({
      confirmationNumber: result.booking.confirmation_number,
      confirmationToken: result.booking.confirmation_token,
      bookingId: result.booking.id,
      demo: result.demo ?? false,
      requiresCheckout: false,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Please check the form and try again.", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Unexpected error creating booking." },
      { status: 500 },
    );
  }
}
