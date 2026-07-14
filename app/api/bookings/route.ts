import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { bookingSchema, createPublicBooking } from "@/lib/bookings";

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

    return NextResponse.json({
      confirmationNumber: result.booking.confirmation_number,
      bookingId: result.booking.id,
      demo: result.demo ?? false,
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
