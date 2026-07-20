import { NextResponse } from "next/server";
import { z } from "zod";
import {
  normalizeMagicLinkToken,
  resolvePostVerifyRedirect,
  verifyFamilyLoginToken,
} from "@/lib/family-login";
import { sanitizeReturnPath } from "@/lib/family-auth-url";

const bodySchema = z.object({
  token: z.string().min(1),
  returnTo: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const token = normalizeMagicLinkToken(body.token);
    const returnTo = sanitizeReturnPath(body.returnTo, "/schedule");

    const result = await verifyFamilyLoginToken(token);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 },
      );
    }

    const redirect = await resolvePostVerifyRedirect({
      parentId: result.parentId,
      purpose: result.purpose,
      returnTo,
    });

    return NextResponse.json({ ok: true, redirect });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
