import { NextResponse } from "next/server";
import { deleteClientFamily } from "@/lib/admin-clients";
import { requireAdminApi } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const result = await deleteClientFamily(id);

  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    bookingCount: result.bookingCount,
  });
}
