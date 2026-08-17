import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth";
import { cancelAdminBooking } from "@/lib/admin-booking-lifecycle";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const result = await cancelAdminBooking(id);
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    bookingId: result.booking.id,
    status: result.booking.status,
  });
}
