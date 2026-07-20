import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffApi } from "@/lib/auth";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";
import { redeemPackageCreditOnAttendance } from "@/lib/packages";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";

const bodySchema = z.object({
  attendanceStatus: z.enum(
    ATTENDANCE_STATUSES as [string, ...string[]],
  ),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = bodySchema.parse(await request.json());

    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        ok: true,
        demo: true,
        attendanceStatus: body.attendanceStatus,
      });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from(DAWG_TABLES.bookings)
      .update({ attendance_status: body.attendanceStatus })
      .eq("id", id)
      .select("id, attendance_status")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Could not update attendance" },
        { status: 400 },
      );
    }

    let creditRedemption: Awaited<
      ReturnType<typeof redeemPackageCreditOnAttendance>
    > | null = null;

    if (body.attendanceStatus === "attended") {
      creditRedemption = await redeemPackageCreditOnAttendance(id);
      if (creditRedemption.ok === false) {
        return NextResponse.json(
          {
            error: creditRedemption.error,
            code: creditRedemption.code,
            attendanceStatus: data.attendance_status,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      attendanceStatus: data.attendance_status,
      creditRedemption,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
