import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { z } from "zod";
import { sanitizeReturnPath } from "@/lib/family-auth";
import { intakeSchema, submitIntake } from "@/lib/intake";

const registerSchema = intakeSchema
  .omit({ packageInterest: true, rememberFamily: true })
  .extend({
    returnTo: z.string().optional(),
    packageInterest: z.enum(["single", "pack-10", "pack-20"]).optional(),
  });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.parse(body);
    const returnTo = sanitizeReturnPath(parsed.returnTo, "/schedule");

    const result = await submitIntake(
      {
        ...parsed,
        packageInterest: parsed.packageInterest ?? "single",
        rememberFamily: true,
      },
      { claimAccount: false },
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      parentId: result.parentId,
      athleteId: result.athleteId,
      redirectTo: returnTo,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const flat = error.flatten();
      const first =
        Object.values(flat.fieldErrors).flat().find(Boolean) ||
        flat.formErrors[0] ||
        "Please check the form.";
      return NextResponse.json({ error: first }, { status: 400 });
    }
    console.error("[api/my/register]", error);
    return NextResponse.json(
      { error: "Could not create account." },
      { status: 500 },
    );
  }
}
