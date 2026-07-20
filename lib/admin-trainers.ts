import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { FALLBACK_TRAINERS } from "@/lib/fallback-data";
import type { Trainer } from "@/lib/types/database";

export const TRAINER_PHOTOS_BUCKET = "trainer-photos";

export async function getAdminTrainers(): Promise<Trainer[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return FALLBACK_TRAINERS;
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from(DAWG_TABLES.trainers)
      .select("*")
      .order("display_order")
      .order("name");

    if (error || !data?.length) {
      return FALLBACK_TRAINERS;
    }
    return data as Trainer[];
  } catch {
    return FALLBACK_TRAINERS;
  }
}

export function parseSpecialties(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function uploadTrainerPhoto(
  trainerId: string,
  file: File,
): Promise<{ ok: true; photoUrl: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable" };
  }

  if (!file.size) {
    return { ok: false, error: "Choose an image file." };
  }

  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Upload a JPEG, PNG, WebP, or GIF image." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${trainerId}/${Date.now()}.${ext}`;
  const supabase = createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(TRAINER_PHOTOS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data } = supabase.storage
    .from(TRAINER_PHOTOS_BUCKET)
    .getPublicUrl(path);

  return { ok: true, photoUrl: data.publicUrl };
}

export async function createTrainer(input: {
  name: string;
  title?: string;
  bio?: string;
  photoUrl?: string;
  specialties?: string[];
  active?: boolean;
  displayOrder?: number;
}): Promise<
  { ok: true; trainer: Trainer } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable" };
  }

  const supabase = createServiceClient();
  let displayOrder = input.displayOrder;
  if (displayOrder == null) {
    const { data: existing } = await supabase
      .from(DAWG_TABLES.trainers)
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1);
    displayOrder = (existing?.[0]?.display_order ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from(DAWG_TABLES.trainers)
    .insert({
      name: input.name.trim(),
      title: input.title?.trim() || null,
      bio: input.bio?.trim() || null,
      photo_url: input.photoUrl?.trim() || null,
      specialties: input.specialties?.length ? input.specialties : null,
      active: input.active ?? true,
      display_order: displayOrder,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create trainer." };
  }

  return { ok: true, trainer: data as Trainer };
}

export async function updateTrainer(
  trainerId: string,
  input: {
    name: string;
    title?: string;
    bio?: string;
    photoUrl?: string | null;
    specialties?: string[];
    active?: boolean;
    displayOrder?: number;
  },
): Promise<
  { ok: true; trainer: Trainer } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable" };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from(DAWG_TABLES.trainers)
    .update({
      name: input.name.trim(),
      title: input.title?.trim() || null,
      bio: input.bio?.trim() || null,
      photo_url: input.photoUrl?.trim() || null,
      specialties: input.specialties?.length ? input.specialties : null,
      active: input.active ?? true,
      display_order: input.displayOrder ?? 0,
    })
    .eq("id", trainerId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not update trainer." };
  }

  return { ok: true, trainer: data as Trainer };
}

export async function deleteTrainer(
  trainerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from(DAWG_TABLES.trainers)
    .delete()
    .eq("id", trainerId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
