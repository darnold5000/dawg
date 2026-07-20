import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { syncAttendedBookingCredits } from "@/lib/packages";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: parentId } = await params;
  const result = await syncAttendedBookingCredits(parentId);

  return NextResponse.json(result);
}
