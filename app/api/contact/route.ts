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

    // Honeypot triggered — pretend success (do not email)
    if ((parsed.company ?? "").trim()) {
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

    if (!process.env.RESEND_API_KEY) {
      console.error("[api/contact] RESEND_API_KEY is not set");
      return NextResponse.json(
        {
          error:
            "Email is not configured yet. Please call or email DAWG directly.",
          code: "EMAIL_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const results = await Promise.allSettled([
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

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length === results.length) {
      console.error("[api/contact] all email sends failed", failed);
      return NextResponse.json(
        {
          error:
            "Could not send your message right now. Please try again or call DAWG.",
          code: "EMAIL_SEND_FAILED",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      const flat = error.flatten();
      const first =
        Object.values(flat.fieldErrors).flat().find(Boolean) ||
        flat.formErrors[0] ||
        "Please check the form and try again.";
      return NextResponse.json(
        { error: first, details: flat },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Could not send your message. Please try again or call DAWG." },
      { status: 500 },
    );
  }
}
