import { NextResponse } from "next/server";
import { loadRememberedFamily } from "@/lib/family-device";
import { athleteBookingReady } from "@/lib/intake";
import {
  listActiveCreditsForParent,
  totalCreditsRemaining,
} from "@/lib/packages";
import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";

/**
 * Returns intake + package credit context for the booking form.
 * Prefer remembered device parent; optional ?email= & ?athleteId=.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.trim().toLowerCase();
    const athleteId = url.searchParams.get("athleteId")?.trim() || null;
    const athleteFirstName = url.searchParams.get("athleteFirstName")?.trim();
    const athleteLastName = url.searchParams.get("athleteLastName")?.trim();
    const athleteDob = url.searchParams.get("athleteDob")?.trim().slice(0, 10);

    let parentId: string | null = null;
    const remembered = await loadRememberedFamily();
    if (remembered) parentId = remembered.parentId;

    if (
      !parentId &&
      email &&
      isSupabaseConfigured() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      const supabase = createTrainingServiceClient();
      const { data } = await supabase
        .from(DAWG_TABLES.parents)
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      parentId = data?.id ?? null;
    }

    let resolvedAthleteId = athleteId;
    let intakeComplete = false;
    let intakeRequired = true;

    if (
      !resolvedAthleteId &&
      parentId &&
      athleteFirstName &&
      athleteLastName &&
      athleteDob &&
      isSupabaseConfigured() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      const supabase = createTrainingServiceClient();
      const { data: siblings } = await supabase
        .from(DAWG_TABLES.athletes)
        .select("id, first_name, last_name, date_of_birth")
        .eq("guardian_id", parentId);
      const match = (siblings ?? []).find(
        (a) =>
          a.first_name.trim().toLowerCase() ===
            athleteFirstName.toLowerCase() &&
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

    if (parentId) {
      creditsRemaining = await totalCreditsRemaining(parentId, athleteId);
      const credits = await listActiveCreditsForParent(parentId, athleteId);
      purchases = credits.map((c) => ({
        id: c.id,
        sessions_remaining: c.sessions_remaining,
        packageName: c.package?.name ?? null,
      }));
    }

    return NextResponse.json({
      parentId,
      athleteId: resolvedAthleteId,
      intakeComplete,
      intakeRequired,
      creditsRemaining,
      purchases,
    });
  } catch (error) {
    console.error("[api/family/booking-context]", error);
    return NextResponse.json(
      { error: "Could not load booking context" },
      { status: 500 },
    );
  }
}
