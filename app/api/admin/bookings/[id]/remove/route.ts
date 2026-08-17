import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { removeAdminBookingFromSession } from "@/lib/admin-booking-lifecycle";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const result = await removeAdminBookingFromSession(id);
  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "NOT_REMOVABLE"
          ? 409
          : 400;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status },
    );
  }

  return NextResponse.json({ ok: true });
}
