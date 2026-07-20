import { NextResponse } from "next/server";
import { z } from "zod";
import { requestFamilyAccessLink } from "@/lib/family-login";
import { sanitizeReturnPath } from "@/lib/family-auth";

const bodySchema = z.object({
  email: z.string().trim().email().max(160),
  returnTo: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, returnTo } = bodySchema.parse(body);
    const result = await requestFamilyAccessLink(
      email,
      sanitizeReturnPath(returnTo, "/schedule"),
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === "EMAIL_FAILED" ? 503 : 400 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
}
