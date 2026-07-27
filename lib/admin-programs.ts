import { z } from "zod";
import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import {
  withTenantInsert,
} from "@/lib/supabase/training-scope";
import { FALLBACK_PROGRAMS } from "@/lib/fallback-data";
import {
  TRAINING_VISIBILITY_VALUES,
  isTrainingVisibility,
  type TrainingVisibility,
} from "@/lib/training-visibility";
import type { Program } from "@/lib/types/database";

export const programWriteSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional()
    .nullable(),
  short_description: z.string().max(500).optional().nullable(),
  full_description: z.string().max(5000).optional().nullable(),
  minimum_age: z.coerce.number().int().min(0).max(99).optional().nullable(),
  maximum_age: z.coerce.number().int().min(0).max(99).optional().nullable(),
  default_duration_minutes: z.coerce.number().int().min(15).max(480).optional(),
  default_capacity: z.coerce.number().int().min(1).max(500).optional(),
  default_price_cents: z.coerce.number().int().min(0).optional(),
  calendar_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  default_visibility: z
    .enum(TRAINING_VISIBILITY_VALUES)
    .optional()
    .nullable(),
  image_url: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  display_order: z.coerce.number().int().optional(),
});

import { slugFromProgramName } from "@/lib/program-slug";

export async function getAdminPrograms(): Promise<Program[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return FALLBACK_PROGRAMS;
  }

  try {
    const supabase = createTrainingServiceClient();
    const { data, error } = await supabase
      .from(DAWG_TABLES.programs)
      .select("*")
      .order("display_order")
      .order("name");

    if (error || !data?.length) {
      return FALLBACK_PROGRAMS;
    }
    return data as Program[];
  } catch {
    return FALLBACK_PROGRAMS;
  }
}

async function uniqueSlug(
  supabase: ReturnType<typeof createTrainingServiceClient>,
  baseSlug: string,
  excludeId?: string,
): Promise<string> {
  let slug = baseSlug;
  let n = 2;
  while (true) {
    let query = supabase
      .from(DAWG_TABLES.programs)
      .select("id")
      .eq("slug", slug);
    if (excludeId) {
      query = query.neq("id", excludeId);
    }
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
}

export async function createProgram(
  input: z.infer<typeof programWriteSchema>,
): Promise<{ ok: true; program: Program } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable" };
  }

  const parsed = programWriteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid program data",
    };
  }

  const supabase = createTrainingServiceClient();
  const baseSlug =
    parsed.data.slug?.trim() || slugFromProgramName(parsed.data.name);
  if (!baseSlug) {
    return { ok: false, error: "Could not generate a URL slug from the name." };
  }
  const slug = await uniqueSlug(supabase, baseSlug);

  let displayOrder = parsed.data.display_order;
  if (displayOrder == null) {
    const { data: existing } = await supabase
      .from(DAWG_TABLES.programs)
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1);
    displayOrder = (existing?.[0]?.display_order ?? 0) + 1;
  }

  const visibility: TrainingVisibility =
    parsed.data.default_visibility &&
    isTrainingVisibility(parsed.data.default_visibility)
      ? parsed.data.default_visibility
      : "public";

  const row = withTenantInsert({
    name: parsed.data.name.trim(),
    slug,
    short_description: parsed.data.short_description?.trim() || null,
    full_description: parsed.data.full_description?.trim() || null,
    minimum_age: parsed.data.minimum_age ?? null,
    maximum_age: parsed.data.maximum_age ?? null,
    default_duration_minutes: parsed.data.default_duration_minutes ?? 60,
    default_capacity: parsed.data.default_capacity ?? 10,
    default_price_cents: parsed.data.default_price_cents ?? 0,
    calendar_color: parsed.data.calendar_color ?? null,
    default_visibility: visibility,
    image_url: parsed.data.image_url?.trim() || null,
    active: parsed.data.active ?? true,
    featured: parsed.data.featured ?? false,
    display_order: displayOrder,
  });

  const { data, error } = await supabase
    .from(DAWG_TABLES.programs)
    .insert(row)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create program." };
  }

  return { ok: true, program: data as Program };
}

export async function updateProgram(
  programId: string,
  input: z.infer<typeof programWriteSchema>,
): Promise<{ ok: true; program: Program } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable" };
  }

  const parsed = programWriteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid program data",
    };
  }

  const supabase = createTrainingServiceClient();
  let slug: string | undefined;
  if (parsed.data.slug?.trim()) {
    slug = await uniqueSlug(supabase, parsed.data.slug.trim(), programId);
  }

  const visibility =
    parsed.data.default_visibility &&
    isTrainingVisibility(parsed.data.default_visibility)
      ? parsed.data.default_visibility
      : undefined;

  const updates: Record<string, unknown> = {
    name: parsed.data.name.trim(),
    short_description: parsed.data.short_description?.trim() || null,
    full_description: parsed.data.full_description?.trim() || null,
    minimum_age: parsed.data.minimum_age ?? null,
    maximum_age: parsed.data.maximum_age ?? null,
    default_duration_minutes: parsed.data.default_duration_minutes ?? 60,
    default_capacity: parsed.data.default_capacity ?? 10,
    default_price_cents: parsed.data.default_price_cents ?? 0,
    calendar_color: parsed.data.calendar_color ?? null,
    image_url: parsed.data.image_url?.trim() || null,
    active: parsed.data.active ?? true,
    featured: parsed.data.featured ?? false,
    display_order: parsed.data.display_order ?? 0,
  };
  if (slug) updates.slug = slug;
  if (visibility) updates.default_visibility = visibility;

  const { data, error } = await supabase
    .from(DAWG_TABLES.programs)
    .update(updates)
    .eq("id", programId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not update program." };
  }

  return { ok: true, program: data as Program };
}

export async function removeProgram(
  programId: string,
): Promise<
  | { ok: true; archived: boolean }
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable" };
  }

  const supabase = createTrainingServiceClient();
  const { count, error: countError } = await supabase
    .from(DAWG_TABLES.sessions)
    .select("id", { count: "exact", head: true })
    .eq("program_id", programId);

  if (countError) {
    return { ok: false, error: countError.message };
  }

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from(DAWG_TABLES.programs)
      .update({ active: false, featured: false })
      .eq("id", programId);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, archived: true };
  }

  const { error } = await supabase
    .from(DAWG_TABLES.programs)
    .delete()
    .eq("id", programId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, archived: false };
}
