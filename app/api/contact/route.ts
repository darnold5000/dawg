import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { contactSchema } from "@/lib/contact";
import { sendContactAcknowledgement, sendContactNotification } from "@/lib/email";

const recent = new Map<string, number>();

function rateLimited(key: string, windowMs = 30_000): boolean {
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < windowMs) return true;
  recent.set(key, now);
  return false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactSchema.parse(body);

    // Honeypot triggered — pretend success
    if (parsed.company) {
      return NextResponse.json({ ok: true });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (rateLimited(`${ip}:${parsed.email}`)) {
      return NextResponse.json(
        { error: "Please wait a moment before sending again." },
        { status: 429 },
      );
    }

    await Promise.allSettled([
      sendContactNotification({
        parentName: parsed.parentName,
        email: parsed.email,
        phone: parsed.phone || undefined,
        athleteAge: parsed.athleteAge,
        message: parsed.message,
      }),
      sendContactAcknowledgement({
        parentName: parsed.parentName,
        email: parsed.email,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Please check the form and try again.", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Could not send your message. Please try again or call DAWGZ." },
      { status: 500 },
    );
  }
}
