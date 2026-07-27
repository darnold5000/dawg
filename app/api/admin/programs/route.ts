import { NextResponse } from "next/server";
import { createProgram, programWriteSchema } from "@/lib/admin-programs";
import { requireAdminApi } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = programWriteSchema.parse(await request.json());
    const result = await createProgram(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, program: result.program }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
