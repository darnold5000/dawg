import { NextResponse } from "next/server";
import { z } from "zod";
import { deliverStaffPasswordResetRequest } from "@/lib/auth/staff-forgot-password";

const bodySchema = z.object({
  email: z.string().email(),
});

/**
 * DAWG-branded staff password reset (Resend + auth.admin.generateLink).
 * Always returns generic success — do not probe registered emails.
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  await deliverStaffPasswordResetRequest(email);

  return NextResponse.json({ ok: true });
}
