import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { submitIntake } from "@/lib/intake";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await submitIntake(body);
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
      intakeId: result.intakeId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const flat = error.flatten();
      const first =
        Object.values(flat.fieldErrors).flat().find(Boolean) ||
        flat.formErrors[0] ||
        "Please check the form.";
      return NextResponse.json({ error: first, details: flat }, { status: 400 });
    }
    console.error("[api/intake]", error);
    return NextResponse.json(
      { error: "Could not save intake." },
      { status: 500 },
    );
  }
}
