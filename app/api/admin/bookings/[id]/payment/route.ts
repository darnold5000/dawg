import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  markFacilityBookingPaid,
  markFacilityBookingUnpaid,
} from "@/lib/billing/adapter";

const bodySchema = z.object({
  action: z.enum(["mark_paid", "mark_unpaid"]),
  amountPaidCents: z.number().int().nonnegative().optional(),
  note: z.string().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = bodySchema.parse(await request.json());
    const result =
      body.action === "mark_paid"
        ? await markFacilityBookingPaid({
            bookingId: id,
            amountPaidCents: body.amountPaidCents,
            note: body.note,
            markedByProfileId: auth.id,
          })
        : await markFacilityBookingUnpaid({
            bookingId: id,
            note: body.note,
            markedByProfileId: auth.id,
          });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, booking: result.data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
