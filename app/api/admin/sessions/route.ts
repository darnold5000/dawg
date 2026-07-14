import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { createSessionsFromForm, sessionFormSchema } from "@/lib/sessions";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = sessionFormSchema.parse(body);
    const result = await createSessionsFromForm(parsed, auth.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ids: result.ids });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error:
            error.issues[0]?.message ?? "Invalid session data",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
