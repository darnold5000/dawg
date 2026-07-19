import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { reconcileCheckoutSession } from "@/lib/billing/reconcile-checkout";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireStaff();
    const { id } = await context.params;
    const result = await reconcileCheckoutSession({ bookingId: id });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      confirmed: result.confirmed,
      bookingId: result.bookingId,
    });
  } catch (error) {
    console.error("[admin/sync-stripe]", error);
    return NextResponse.json(
      { error: "Could not sync from Stripe" },
      { status: 500 },
    );
  }
}
