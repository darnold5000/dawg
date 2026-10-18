import { NextResponse } from "next/server";
import { loadRememberedFamily } from "@/lib/family-device";
import {
  emptyFamilyBookingContext,
  resolveAuthorizedFamilyContextQuery,
} from "@/lib/family-context-access";
import { athleteBookingReady } from "@/lib/intake";
import { listCreditsCoveringBooking } from "@/lib/packages";
import { filterPurchasesByProgramSlug } from "@/lib/program-package-credits";
import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";

/**
 * Returns intake + package credit context for the booking form.
 * Requires a valid dawg_family_device session — email query params do not
 * identify a household.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const remembered = await loadRememberedFamily();

    if (!remembered) {
      return NextResponse.json(emptyFamilyBookingContext());
    }

    const authorized = resolveAuthorizedFamilyContextQuery(remembered, {
      parentId: url.searchParams.get("parentId"),
      email: url.searchParams.get("email"),
      athleteId: url.searchParams.get("athleteId"),
      athleteFirstName: url.searchParams.get("athleteFirstName"),
      athleteLastName: url.searchParams.get("athleteLastName"),
      athleteDob: url.searchParams.get("athleteDob"),
    });

    if (!authorized) {
      return NextResponse.json(emptyFamilyBookingContext());
    }

    const parentId = authorized.parentId;
    let parentOnFile: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    } | null = null;
    let athletesOnFile: Array<{
      id: string;
      firstName: string;
      lastName: string;
      dob: string;
      experienceLevel?: string;
    }> = [];

    if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createTrainingServiceClient();
      const { data: parentRow } = await supabase
        .from(DAWG_TABLES.parents)
        .select("first_name, last_name, email, phone")
        .eq("id", parentId)
        .maybeSingle();
      if (parentRow) {
        parentOnFile = {
          firstName: parentRow.first_name ?? "",
          lastName: parentRow.last_name ?? "",
          email: parentRow.email ?? "",
          phone: parentRow.phone ?? "",
        };
      }
      const { data: athleteRows } = await supabase
        .from(DAWG_TABLES.athletes)
        .select("id, first_name, last_name, date_of_birth, experience_level")
        .eq("guardian_id", parentId)
        .order("first_name", { ascending: true });
      athletesOnFile = (athleteRows ?? []).map((a) => ({
        id: a.id,
        firstName: a.first_name,
        lastName: a.last_name,
        dob: String(a.date_of_birth ?? "").slice(0, 10),
        experienceLevel: a.experience_level ?? undefined,
      }));
    }

    let resolvedAthleteId = authorized.athleteId;
    let intakeComplete = false;
    let intakeRequired = true;

    if (
      !resolvedAthleteId &&
      authorized.athleteFirstName?.trim() &&
      authorized.athleteLastName?.trim() &&
      authorized.athleteDob?.trim() &&
      isSupabaseConfigured() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      const athleteFirstName = authorized.athleteFirstName.trim();
      const athleteLastName = authorized.athleteLastName.trim();
      const athleteDob = authorized.athleteDob.trim().slice(0, 10);
      const supabase = createTrainingServiceClient();
      const { data: siblings } = await supabase
        .from(DAWG_TABLES.athletes)
        .select("id, first_name, last_name, date_of_birth")
        .eq("guardian_id", parentId);
      const match = (siblings ?? []).find(
        (a) =>
          a.first_name.trim().toLowerCase() === athleteFirstName.toLowerCase() &&
          a.last_name.trim().toLowerCase() === athleteLastName.toLowerCase() &&
          a.date_of_birth === athleteDob,
      );
      if (match) resolvedAthleteId = match.id;
    }

    if (resolvedAthleteId) {
      const readiness = await athleteBookingReady(resolvedAthleteId);
      intakeComplete = readiness.ready;
      intakeRequired = !readiness.ready;
    }

    let creditsRemaining = 0;
    let purchases: Array<{
      id: string;
      sessions_remaining: number;
      packageName: string | null;
    }> = [];

    const programSlug = url.searchParams.get("programSlug")?.trim() || null;
    const credits = filterPurchasesByProgramSlug(
      await listCreditsCoveringBooking(parentId, resolvedAthleteId),
      programSlug,
    );
    creditsRemaining = credits.reduce(
      (sum, credit) => sum + credit.sessions_remaining,
      0,
    );
    purchases = credits.map((c) => ({
      id: c.id,
      sessions_remaining: c.sessions_remaining,
      packageName: c.package?.name ?? null,
    }));

    console.info("[booking-context] hydration", {
      hasRememberedFamily: true,
      guardianId: parentId,
      hasParentEmail: Boolean(parentOnFile?.email),
      emailSource: "cookie",
      athleteCount: athletesOnFile.length,
      bookingContextLoaded: true,
    });

    return NextResponse.json({
      parentId,
      athleteId: resolvedAthleteId,
      intakeComplete,
      intakeRequired,
      creditsRemaining,
      purchases,
      parentOnFile,
      athletesOnFile,
    });
  } catch (error) {
    console.error("[api/family/booking-context]", error);
    return NextResponse.json(
      { error: "Could not load booking context" },
      { status: 500 },
    );
  }
}
