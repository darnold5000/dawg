import { NextResponse } from "next/server";
import { z } from "zod";

import { revokeStaffMember, updateStaffMember } from "@/lib/admin-staff";
import { requireOwnerApi } from "@/lib/auth";
import { isTrainingDeploymentConfigured } from "@/lib/tenant/deployment";

const patchSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).optional().nullable(),
  role: z.enum(["admin", "trainer"]).optional(),
});

type RouteContext = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireOwnerApi();
  if (auth instanceof NextResponse) return auth;

  if (!isTrainingDeploymentConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { userId } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const staff = await updateStaffMember({
      userId,
      actorUserId: auth.id,
      ...parsed.data,
    });
    return NextResponse.json({ staff });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update staff";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireOwnerApi();
  if (auth instanceof NextResponse) return auth;

  if (!isTrainingDeploymentConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { userId } = await context.params;

  try {
    await revokeStaffMember({ userId, actorUserId: auth.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not revoke staff";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
