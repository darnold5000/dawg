"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Trainer } from "@/lib/types/database";

function trainerToForm(trainer: Trainer) {
  return {
    name: trainer.name,
    title: trainer.title ?? "",
    bio: trainer.bio ?? "",
    photo_url: trainer.photo_url ?? "",
    specialties: trainer.specialties?.join(", ") ?? "",
    active: trainer.active,
    display_order: String(trainer.display_order),
  };
}

function appendTrainerFormData(
  formData: FormData,
  form: ReturnType<typeof trainerToForm>,
  photoFile: File | null,
) {
  formData.set("name", form.name);
  formData.set("title", form.title);
  formData.set("bio", form.bio);
  formData.set("photo_url", form.photo_url);
  formData.set("specialties", form.specialties);
  formData.set("active", form.active ? "true" : "false");
  formData.set("display_order", form.display_order);
  if (photoFile) {
    formData.set("photo", photoFile);
  }
}

export function TrainerCreateForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    title: "",
    bio: "",
    photo_url: "",
    specialties: "",
    active: true,
    display_order: "",
  });

  function onPhotoChange(file: File | null) {
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      appendTrainerFormData(formData, form, photoFile);
      const res = await fetch("/api/admin/trainers", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not add trainer");
        return;
      }
      toast.success("Trainer added");
      setForm({
        name: "",
        title: "",
        bio: "",
        photo_url: "",
        specialties: "",
        active: true,
        display_order: "",
      });
      onPhotoChange(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      toast.error("Could not add trainer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <h3 className="font-heading text-xl tracking-wide">Add trainer</h3>
      <p className="text-xs text-muted-foreground">
        New trainers appear on the home page and About page when marked active.
      </p>
      <TrainerFields
        form={form}
        setForm={setForm}
        photoPreview={photoPreview}
        fileRef={fileRef}
        onPhotoChange={onPhotoChange}
      />
      <Button
        type="submit"
        disabled={loading}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {loading ? "Saving…" : "Add trainer"}
      </Button>
    </form>
  );
}

export function TrainerEditCard({ trainer }: { trainer: Trainer }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState(trainerToForm(trainer));

  function onPhotoChange(file: File | null) {
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      appendTrainerFormData(formData, form, photoFile);
      const res = await fetch(`/api/admin/trainers/${trainer.id}`, {
        method: "PATCH",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save trainer");
        return;
      }
      toast.success("Trainer updated");
      onPhotoChange(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      toast.error("Could not save trainer");
    } finally {
      setLoading(false);
    }
  }

  const previewSrc =
    photoPreview ?? (form.photo_url || "/images/dawg/trainers/placeholder.svg");

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-xl tracking-wide">{trainer.name}</h3>
          <p className="text-xs text-muted-foreground">
            Shown publicly when active
          </p>
        </div>
        <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-secondary">
          <Image
            src={previewSrc}
            alt={`Photo of ${form.name}`}
            fill
            className="object-cover"
            sizes="96px"
            unoptimized={previewSrc.startsWith("blob:")}
          />
        </div>
      </div>
      <TrainerFields
        form={form}
        setForm={setForm}
        photoPreview={photoPreview}
        fileRef={fileRef}
        onPhotoChange={onPhotoChange}
      />
      <Button
        type="submit"
        disabled={loading}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

function TrainerFields({
  form,
  setForm,
  fileRef,
  onPhotoChange,
  photoPreview,
}: {
  form: {
    name: string;
    title: string;
    bio: string;
    photo_url: string;
    specialties: string;
    active: boolean;
    display_order: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      title: string;
      bio: string;
      photo_url: string;
      specialties: string;
      active: boolean;
      display_order: string;
    }>
  >;
  photoPreview: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onPhotoChange: (file: File | null) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`name-${form.name}`}>Name</Label>
        <Input
          id={`name-${form.name}`}
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`title-${form.name}`}>Title</Label>
        <Input
          id={`title-${form.name}`}
          placeholder="Owner / Head Trainer"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`bio-${form.name}`}>Bio</Label>
        <Textarea
          id={`bio-${form.name}`}
          rows={4}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`specialties-${form.name}`}>Specialties</Label>
        <Input
          id={`specialties-${form.name}`}
          placeholder="Speed, Agility, Youth Athletic Development"
          value={form.specialties}
          onChange={(e) => setForm({ ...form, specialties: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">Comma-separated</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`photo-${form.name}`}>Upload photo</Label>
        <input
          id={`photo-${form.name}`}
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
          onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`photo-url-${form.name}`}>Or photo URL</Label>
        <Input
          id={`photo-url-${form.name}`}
          placeholder="/images/dawg/trainers/avery.jpg"
          value={form.photo_url}
          onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
        />
        {photoPreview ? (
          <p className="text-xs text-muted-foreground">
            Upload overrides URL on save.
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`order-${form.name}`}>Display order</Label>
        <Input
          id={`order-${form.name}`}
          type="number"
          min={0}
          value={form.display_order}
          onChange={(e) =>
            setForm({ ...form, display_order: e.target.value })
          }
        />
      </div>
      <label className="flex items-center gap-2 self-end text-sm">
        <Checkbox
          checked={form.active}
          onCheckedChange={(v) => setForm({ ...form, active: Boolean(v) })}
        />
        Active on public site
      </label>
    </div>
  );
}
