import { NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";

/** After client sign-in, confirm this session has DAWG staff access (same check as /admin). */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      {
        error:
          "No server session yet. Use staff login again; if this persists, restart the dev server.",
        code: "NO_SESSION",
      },
      { status: 401 },
    );
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(
      {
        error:
          "This account is not set up for DAWG staff access. Use the email that has a training_staff_profiles row for the DAWG tenant, and ensure TRAINING_TENANT_ID matches in .env.local.",
        code: "NO_STAFF_PROFILE",
      },
      { status: 403 },
    );
  }
  if (!isStaffRole(profile.role)) {
    return NextResponse.json(
      { error: "Your staff role cannot access the admin area.", code: "FORBIDDEN_ROLE" },
      { status: 403 },
    );
  }
  return NextResponse.json({ ok: true, role: profile.role });
}
