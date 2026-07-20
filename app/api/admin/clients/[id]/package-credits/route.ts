import { NextResponse } from "next/server";
import {
  applyPackageCreditAdjustment,
  packageCreditAdjustmentSchema,
} from "@/lib/admin-package-credits";
import { requireAdminApi } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: parentId } = await params;

  try {
    const body = packageCreditAdjustmentSchema.parse(await request.json());
    const result = await applyPackageCreditAdjustment({
      parentId,
      staffProfileId: auth.id,
      body,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      purchase: {
        id: result.purchase.id,
        sessions_remaining: result.purchase.sessions_remaining,
        sessions_total: result.purchase.sessions_total,
        packageName: result.purchase.package?.name ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
