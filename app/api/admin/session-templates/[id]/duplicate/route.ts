import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { duplicateSessionTemplate } from "@/lib/session-templates";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const result = await duplicateSessionTemplate(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ id: result.id });
}
