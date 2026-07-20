import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffApi } from "@/lib/auth";
import { mergeParents } from "@/lib/merge-parents";

const bodySchema = z.object({
  canonicalParentId: z.string().uuid(),
  duplicateParentId: z.string().uuid(),
});

export async function POST(request: Request) {
  const staff = await requireStaffApi();
  if (staff instanceof NextResponse) return staff;

  try {
    const body = await request.json();
    const parsed = bodySchema.parse(body);
    const result = await mergeParents({
      canonicalParentId: parsed.canonicalParentId,
      duplicateParentId: parsed.duplicateParentId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === "NOT_FOUND" ? 404 : 400 },
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Invalid merge request." },
      { status: 400 },
    );
  }
}
