import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";

const schema = z.object({
  reviewer_name: z.string().min(1),
  reviewer_description: z.string().optional(),
  athlete_sport: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  review_text: z.string().min(1),
  published: z.boolean(),
  featured: z.boolean(),
  display_order: z.coerce.number().int().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const body = schema.parse(await request.json());
    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: true, demo: true });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from(DAWG_TABLES.reviews)
      .update({
        reviewer_name: body.reviewer_name,
        reviewer_description: body.reviewer_description || null,
        athlete_sport: body.athlete_sport || null,
        rating: body.rating,
        review_text: body.review_text,
        published: body.published,
        featured: body.featured,
        ...(body.display_order != null
          ? { display_order: body.display_order }
          : {}),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: true, demo: true });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from(DAWG_TABLES.reviews)
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
