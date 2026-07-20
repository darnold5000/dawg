import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createPackageCheckout } from "@/lib/billing/package-checkout";
import { packageCheckoutSchema } from "@/lib/packages";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = packageCheckoutSchema.parse(body);
    const result = await createPackageCheckout(parsed);
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
