import { NextResponse } from "next/server";
import { z } from "zod";
import {
  endRecurringScheduleEarly,
  extendRecurringSchedule,
  replaceRecurringScheduleTime,
} from "@/lib/recurring-schedule-manage";
import { requireAdminApi } from "@/lib/auth";

const endSchema = z.object({
  template_id: z.string().uuid(),
  last_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const extendSchema = z.object({
  template_id: z.string().uuid(),
  new_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const replaceSchema = z.object({
  template_id: z.string().uuid(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  new_start_time: z.string().min(4),
  duration_minutes: z.coerce.number().int().min(15).max(480).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const body = await request.json();

  try {
    if (action === "end") {
      const parsed = endSchema.parse(body);
      const result = await endRecurringScheduleEarly({
        templateId: parsed.template_id,
        lastDate: parsed.last_date,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, cancelled: result.cancelled });
    }

    if (action === "extend") {
      const parsed = extendSchema.parse(body);
      const result = await extendRecurringSchedule({
        templateId: parsed.template_id,
        newEndDate: parsed.new_end_date,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, created: result.created });
    }

    if (action === "replace") {
      const parsed = replaceSchema.parse(body);
      const result = await replaceRecurringScheduleTime({
        templateId: parsed.template_id,
        effectiveDate: parsed.effective_date,
        newStartTime: parsed.new_start_time,
        durationMinutes: parsed.duration_minutes,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, updated: result.updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
