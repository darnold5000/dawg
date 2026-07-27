import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  previewTemplateOccurrences,
  templateScheduleSchema,
} from "@/lib/template-scheduling";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = templateScheduleSchema.parse(body);
    const preview = await previewTemplateOccurrences(id, parsed);
    if ("errors" in preview) {
      return NextResponse.json({ errors: preview.errors }, { status: 400 });
    }
    return NextResponse.json({ preview });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid schedule" },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
