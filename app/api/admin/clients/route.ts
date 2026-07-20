import { NextResponse } from "next/server";
import { z } from "zod";
import { createClientFamily } from "@/lib/admin-clients";
import { requireStaffApi } from "@/lib/auth";

const schema = z.object({
  parentFirstName: z.string().min(1),
  parentLastName: z.string().min(1),
  parentEmail: z.string().email(),
  parentPhone: z.string().min(1),
  athleteFirstName: z.string().optional(),
  athleteLastName: z.string().optional(),
  athleteDob: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = schema.parse(await request.json());
    const result = await createClientFamily(body);

    if (!result.ok) {
      const status = result.code === "DUPLICATE_EMAIL" ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      parentId: result.parentId,
      athleteId: result.athleteId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
