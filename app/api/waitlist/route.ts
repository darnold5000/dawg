import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { joinWaitlist, waitlistSchema } from "@/lib/bookings";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = waitlistSchema.parse(body);
    const result = await joinWaitlist(parsed);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Please check the form and try again." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Unexpected error joining waitlist." },
      { status: 500 },
    );
  }
}
