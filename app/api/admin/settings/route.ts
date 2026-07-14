import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";

const schema = z.object({
  id: z.string().min(1),
  business_name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  facebook_url: z.string().optional(),
  business_hours: z.string().optional(),
  homepage_announcement: z.string().optional(),
  map_embed_url: z.string().optional(),
  cancellation_policy: z.string().optional(),
  booking_policy: z.string().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = schema.parse(await request.json());
    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: true, demo: true });
    }

    const { id, ...rest } = body;
    const supabase = createServiceClient();
    const { error } = await supabase
      .from(DAWG_TABLES.businessSettings)
      .update(rest)
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
