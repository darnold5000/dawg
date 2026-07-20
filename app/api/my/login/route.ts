import { NextResponse } from "next/server";
import { z } from "zod";
import { requestFamilyLogin } from "@/lib/family-login";

const bodySchema = z.object({
  email: z.string().trim().email().max(160),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = bodySchema.parse(body);
    const result = await requestFamilyLogin(email);
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
