import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { refundBooking } from "@/lib/billing/adapter";

const bodySchema = z.object({
  reason: z.string().max(500).optional(),
  cancelBooking: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const result = await refundBooking({
      bookingId: id,
      reason: body.reason,
      cancelBooking: body.cancelBooking,
      refundedByProfileId: auth.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      booking: result.data.booking,
      stripeRefundId: result.data.stripeRefundId,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
