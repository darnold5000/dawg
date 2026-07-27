import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  bulkWeekdayScheduleSchema,
  previewBulkWeekdaySchedule,
  runBulkWeekdaySchedule,
} from "@/lib/bulk-template-scheduling";
import { requireAdminApi } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = bulkWeekdayScheduleSchema.parse(await request.json());
    const preview = await previewBulkWeekdaySchedule(body);
    const result = await runBulkWeekdaySchedule(body, auth.id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, preview: result.preview ?? preview },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      count: result.total_count,
      lines: result.lines,
      preview,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid schedule" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Schedule failed",
      },
      { status: 500 },
    );
  }
}
