import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createPackageCheckout } from "@/lib/billing/package-checkout";
import {
  loggedInPackageCheckoutSchema,
  publicPackageCheckoutSchema,
} from "@/lib/packages";
import {
  parentEmailMatches,
  requireFamilySessionApi,
} from "@/lib/family-auth";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Service unavailable." },
      { status: 503 },
    );
  }

  const family = await requireFamilySessionApi();
  const body = await request.json().catch(() => ({}));

  try {
    if (!(family instanceof NextResponse)) {
      const parsed = loggedInPackageCheckoutSchema.parse(body);
      const supabase = createServiceClient();
      const { data: parent } = await supabase
        .from(DAWG_TABLES.parents)
        .select("id, first_name, last_name, email, phone")
        .eq("id", family.parentId)
        .maybeSingle();

      if (!parent?.email) {
        return NextResponse.json(
          { error: "Parent record not found." },
          { status: 400 },
        );
      }

      if (!parentEmailMatches(family, parent.email)) {
        return NextResponse.json(
          { error: "Session mismatch. Please sign in again." },
          { status: 403 },
        );
      }

      let athleteId = parsed.athleteId ?? family.athletes[0]?.id ?? null;
      if (athleteId && !family.athletes.some((a) => a.id === athleteId)) {
        return NextResponse.json(
          { error: "Invalid athlete for this family." },
          { status: 403 },
        );
      }

      if (!athleteId) {
        const { data: athletes } = await supabase
          .from(DAWG_TABLES.athletes)
          .select("id")
          .eq("parent_id", family.parentId)
          .limit(1);
        athleteId = athletes?.[0]?.id ?? null;
      }

      const athlete =
        family.athletes.find((a) => a.id === athleteId) ?? family.athletes[0];

      const result = await createPackageCheckout({
        packageSlug: parsed.packageSlug,
        parentId: family.parentId,
        athleteId,
        parentFirstName: parent.first_name ?? family.parentFirstName,
        parentLastName: parent.last_name ?? family.parentLastName,
        parentEmail: parent.email,
        parentPhone: parent.phone ?? family.parentPhone,
        athleteFirstName: athlete?.firstName ?? "Athlete",
        athleteLastName: athlete?.lastName ?? "",
        athleteDob: athlete?.dob ?? "2000-01-01",
        schoolGrade: "",
        heightWeight: "",
        sportPosition: "",
        healthIssues: "",
        emergencyContact1Name: "On file",
        emergencyContact1Phone: parent.phone ?? family.parentPhone,
        emergencyContact2Name: "",
        emergencyContact2Phone: "",
        shirtSize: null,
        goal: "",
        acceptWaiver: true,
        mediaConsent: family.mediaConsentPreference,
        rememberFamily: false,
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
    }

    const parsed = publicPackageCheckoutSchema.parse(body);
    const result = await createPackageCheckout({
      packageSlug: parsed.packageSlug,
      parentFirstName: parsed.parentFirstName,
      parentLastName: parsed.parentLastName,
      parentEmail: parsed.parentEmail,
      parentPhone: parsed.parentPhone,
      athleteFirstName: "Package",
      athleteLastName: "Purchase",
      athleteDob: "2000-01-01",
      schoolGrade: "",
      heightWeight: "",
      sportPosition: "",
      healthIssues: "",
      emergencyContact1Name: parsed.parentFirstName,
      emergencyContact1Phone: parsed.parentPhone,
      emergencyContact2Name: "",
      emergencyContact2Phone: "",
      shirtSize: null,
      goal: "",
      acceptWaiver: true,
      mediaConsent: false,
      rememberFamily: false,
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
