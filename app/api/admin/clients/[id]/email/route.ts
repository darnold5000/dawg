import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffApi } from "@/lib/auth";
import { getClientFamily } from "@/lib/admin-clients";
import { sendParentStaffMessage } from "@/lib/email";

const schema = z.object({
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(4000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireStaffApi();
    if (auth instanceof NextResponse) return auth;

    const { id } = await context.params;
    const family = await getClientFamily(id);
    if (!family) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Email is not configured. Set RESEND_API_KEY on the server, or use Open in email app.",
          code: "EMAIL_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const body = schema.parse(await request.json());
    await sendParentStaffMessage({
      parentName: `${family.parent.first_name} ${family.parent.last_name}`,
      email: family.parent.email,
      subject: body.subject,
      message: body.message,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Check subject and message." },
        { status: 400 },
      );
    }
    console.error("[admin/clients/email]", error);
    return NextResponse.json(
      { error: "Could not send email" },
      { status: 500 },
    );
  }
}
