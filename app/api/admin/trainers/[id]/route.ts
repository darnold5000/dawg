import { NextResponse } from "next/server";
import { z } from "zod";
import {
  parseSpecialties,
  updateTrainer,
  uploadTrainerPhoto,
} from "@/lib/admin-trainers";
import { requireAdminApi } from "@/lib/auth";

const jsonSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  bio: z.string().optional(),
  photo_url: z.string().nullable().optional(),
  specialties: z.union([z.string(), z.array(z.string())]).optional(),
  active: z.boolean().optional(),
  display_order: z.coerce.number().int().optional(),
});

async function parseTrainerBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const specialtiesRaw = String(formData.get("specialties") ?? "");
    const photoFile = formData.get("photo");
    return {
      name: String(formData.get("name") ?? ""),
      title: String(formData.get("title") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      photo_url: String(formData.get("photo_url") ?? ""),
      specialties: parseSpecialties(specialtiesRaw),
      active: formData.get("active") !== "false",
      display_order: formData.get("display_order")
        ? Number(formData.get("display_order"))
        : undefined,
      photoFile: photoFile instanceof File && photoFile.size > 0 ? photoFile : null,
    };
  }

  const body = jsonSchema.parse(await request.json());
  return {
    name: body.name,
    title: body.title ?? "",
    bio: body.bio ?? "",
    photo_url: body.photo_url ?? "",
    specialties: Array.isArray(body.specialties)
      ? body.specialties
      : parseSpecialties(body.specialties),
    active: body.active ?? true,
    display_order: body.display_order,
    photoFile: null as File | null,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const input = await parseTrainerBody(request);
    if (!input.name.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    let photoUrl = input.photo_url.trim() || null;
    if (input.photoFile) {
      const uploaded = await uploadTrainerPhoto(id, input.photoFile);
      if (!uploaded.ok) {
        return NextResponse.json({ error: uploaded.error }, { status: 400 });
      }
      photoUrl = uploaded.photoUrl;
    }

    const updated = await updateTrainer(id, {
      name: input.name,
      title: input.title,
      bio: input.bio,
      photoUrl,
      specialties: input.specialties,
      active: input.active,
      displayOrder: input.display_order,
    });

    if (!updated.ok) {
      return NextResponse.json({ error: updated.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, trainer: updated.trainer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
