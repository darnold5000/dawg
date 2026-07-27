import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  scheduleTemplateOccurrences,
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
    const result = await scheduleTemplateOccurrences(id, parsed, auth.id);
    if (!result.ok) {
      const status = result.code === "CONFLICT" ? 409 : 400;
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          preview: result.preview,
        },
        { status },
      );
    }
    return NextResponse.json({
      ids: result.ids,
      count: result.ids.length,
      preview: result.preview,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid schedule" },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Schedule failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
