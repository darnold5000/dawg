import { NextResponse } from "next/server";
import { loadRememberedFamily } from "@/lib/family-device";
import { athleteBookingReady } from "@/lib/intake";
import {
  listActiveCreditsForParent,
  totalCreditsRemaining,
} from "@/lib/packages";
import {
  createServiceClient,
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

    let parentId: string | null = null;
    const remembered = await loadRememberedFamily();
    if (remembered) parentId = remembered.parentId;

    if (
      !parentId &&
      email &&
      isSupabaseConfigured() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from(DAWG_TABLES.parents)
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      parentId = data?.id ?? null;
    }

    let intakeComplete = false;
    let intakeRequired = true;
    if (athleteId) {
      const readiness = await athleteBookingReady(athleteId);
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
      athleteId,
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
