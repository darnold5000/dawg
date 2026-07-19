import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { dollarsToCents } from "@/lib/billing/format";
import { sessionFormSchema } from "@/lib/sessions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = sessionFormSchema.omit({ recurrence: true, recurrence_weeks: true, recurrence_days: true }).parse({
      ...body,
      recurrence: "none",
      recurrence_weeks: 1,
      recurrence_days: [],
    });

    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: true, demo: true });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from(DAWG_TABLES.sessions)
      .update({
        title: parsed.title,
        program_id: parsed.program_id || null,
        session_type_id: parsed.session_type_id || null,
        trainer_id: parsed.trainer_id || null,
        description: parsed.description || null,
        session_date: parsed.session_date,
        start_time: parsed.start_time.length === 5 ? `${parsed.start_time}:00` : parsed.start_time,
        end_time: parsed.end_time.length === 5 ? `${parsed.end_time}:00` : parsed.end_time,
        minimum_age: parsed.minimum_age ?? null,
        maximum_age: parsed.maximum_age ?? null,
        skill_level: parsed.skill_level || null,
        capacity: parsed.capacity,
        price_cents: dollarsToCents(parsed.price),
        deposit_amount_cents:
          parsed.deposit_amount != null
            ? dollarsToCents(parsed.deposit_amount)
            : null,
        currency: "usd",
        payment_requirement: parsed.payment_requirement,
        location_name: parsed.location_name || null,
        location_address: parsed.location_address || null,
        what_to_bring: parsed.what_to_bring || null,
        cancellation_policy: parsed.cancellation_policy || null,
        status: parsed.status,
        featured: parsed.featured ?? false,
        published_at:
          parsed.status === "published" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
