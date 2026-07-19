import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { generatePrivateSlots } from "@/lib/sessions";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { dollarsToCents } from "@/lib/billing/format";
import { SITE } from "@/lib/constants";

const schema = z.object({
  trainer_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string(),
  endTime: z.string(),
  durationMinutes: z.coerce.number().int().positive(),
  bufferMinutes: z.coerce.number().int().nonnegative(),
  price: z.coerce.number().nonnegative(),
  minimum_age: z.coerce.number().int().optional(),
  maximum_age: z.coerce.number().int().optional(),
  capacity: z.coerce.number().int().positive().default(1),
});

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = schema.parse(await request.json());
    const slots = generatePrivateSlots(body);

    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ count: slots.length, demo: true });
    }

    const supabase = createServiceClient();
    const { data: privateType } = await supabase
      .from(DAWG_TABLES.sessionTypes)
      .select("id")
      .eq("slug", "private-lesson")
      .maybeSingle();

    const rows = slots.map((slot) => ({
      trainer_id: body.trainer_id,
      session_type_id: privateType?.id ?? null,
      title: "Private Training",
      description: "One-on-one private lesson",
      session_date: body.date,
      start_time: slot.start,
      end_time: slot.end,
      minimum_age: body.minimum_age ?? null,
      maximum_age: body.maximum_age ?? null,
      capacity: body.capacity,
      price_cents: dollarsToCents(body.price),
      currency: "usd",
      payment_requirement: "pay_at_facility",
      location_name: SITE.name,
      location_address: SITE.address.full,
      status: "published",
      published_at: new Date().toISOString(),
      created_by: auth.id,
    }));

    const { error } = await supabase.from(DAWG_TABLES.sessions).insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ count: rows.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
