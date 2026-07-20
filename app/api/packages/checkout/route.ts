import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createPackageCheckout } from "@/lib/billing/package-checkout";
import { packageCheckoutSchema } from "@/lib/packages";
import { submitIntake } from "@/lib/intake";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = packageCheckoutSchema.parse(body);

    const intakeResult = await submitIntake({
      parentFirstName: parsed.parentFirstName,
      parentLastName: parsed.parentLastName,
      parentEmail: parsed.parentEmail,
      parentPhone: parsed.parentPhone,
      athleteFirstName: parsed.athleteFirstName,
      athleteLastName: parsed.athleteLastName,
      athleteDob: parsed.athleteDob,
      schoolGrade: parsed.schoolGrade,
      heightWeight: parsed.heightWeight,
      sportPosition: parsed.sportPosition,
      healthIssues: parsed.healthIssues,
      emergencyContact1Name: parsed.emergencyContact1Name,
      emergencyContact1Phone: parsed.emergencyContact1Phone,
      emergencyContact2Name: parsed.emergencyContact2Name,
      emergencyContact2Phone: parsed.emergencyContact2Phone,
      packageInterest: parsed.packageSlug,
      shirtSize: parsed.shirtSize,
      goal: parsed.goal,
      acceptWaiver: parsed.acceptWaiver,
      mediaConsent: parsed.mediaConsent,
      rememberFamily: parsed.rememberFamily,
    });

    if (!intakeResult.ok) {
      return NextResponse.json(
        { error: intakeResult.error, code: intakeResult.code },
        { status: 400 },
      );
    }

    const result = await createPackageCheckout({
      ...parsed,
      parentId: intakeResult.parentId,
      athleteId: intakeResult.athleteId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 },
      );
    }
    return NextResponse.json({
      checkoutUrl: result.data.url,
      purchaseId: result.data.purchaseId,
      checkoutSessionId: result.data.sessionId,
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
    console.error("[api/packages/checkout]", error);
    return NextResponse.json(
      { error: "Could not start package checkout." },
      { status: 500 },
    );
  }
}
