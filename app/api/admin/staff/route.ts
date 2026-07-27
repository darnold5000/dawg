import { NextResponse } from "next/server";
import { z } from "zod";

import {
  inviteStaffMember,
  isInvitableStaffRole,
  listStaffMembers,
} from "@/lib/admin-staff";
import { requireOwnerApi } from "@/lib/auth";
import { isTrainingDeploymentConfigured } from "@/lib/tenant/deployment";

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  role: z.enum(["admin", "trainer"]),
  phone: z.string().max(40).optional().nullable(),
});

export async function GET() {
  const auth = await requireOwnerApi();
  if (auth instanceof NextResponse) return auth;

  if (!isTrainingDeploymentConfigured()) {
    return NextResponse.json(
      {
        error:
          "Staff management requires TRAINING_TENANT_ID on Signal Works Pro.",
      },
      { status: 503 },
    );
  }

  try {
    const staff = await listStaffMembers();
    return NextResponse.json({ staff });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load staff";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireOwnerApi();
  if (auth instanceof NextResponse) return auth;

  if (!isTrainingDeploymentConfigured()) {
    return NextResponse.json(
      {
        error:
          "Staff invites require TRAINING_TENANT_ID on Signal Works Pro.",
      },
      { status: 503 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!isInvitableStaffRole(parsed.data.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const result = await inviteStaffMember({
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      phone: parsed.data.phone,
    });
    return NextResponse.json({
      staff: result.staff,
      delivery: result.delivery,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not invite staff";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
