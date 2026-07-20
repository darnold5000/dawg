"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

export function TrainerCreateForm({
  embedded = false,
  onSuccess,
}: {
  embedded?: boolean;
  onSuccess?: () => void;
}) {
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
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch {
      toast.error("Could not add trainer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        embedded ? "space-y-4" : "space-y-4 rounded-xl border border-border bg-card p-5"
      }
    >
      {!embedded ? (
        <>
          <h3 className="font-heading text-xl tracking-wide">Add trainer</h3>
          <p className="text-xs text-muted-foreground">
            New trainers appear on the home page and About page when marked active.
          </p>
        </>
      ) : null}
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
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState(trainerToForm(trainer));

  function onPhotoChange(file: File | null) {
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function cancelEdit() {
    setForm(trainerToForm(trainer));
    onPhotoChange(null);
    if (fileRef.current) fileRef.current.value = "";
    setEditing(false);
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
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Could not save trainer");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    const confirmed = window.confirm(
      `Delete ${trainer.name}? They will be removed from the public site.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/trainers/${trainer.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not delete trainer");
        return;
      }
      toast.success("Trainer deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete trainer");
    } finally {
      setDeleting(false);
    }
  }

  const photoSrc =
    trainer.photo_url || "/images/dawg/trainers/placeholder.svg";

  if (!editing) {
    return (
      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
            <Image
              src={photoSrc}
              alt={`Photo of ${trainer.name}`}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-xl tracking-wide">
                  {trainer.name}
                </h3>
                <Badge variant={trainer.active ? "default" : "secondary"}>
                  {trainer.active ? "Active" : "Hidden"}
                </Badge>
                <Badge variant="outline">Order {trainer.display_order}</Badge>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit trainer"
                  disabled={deleting}
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete trainer"
                  className="text-destructive hover:text-destructive"
                  disabled={deleting}
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {trainer.title ? (
              <p className="mt-1 text-sm text-muted-foreground">{trainer.title}</p>
            ) : null}
            {trainer.specialties?.length ? (
              <p className="mt-2 text-sm">
                {trainer.specialties.join(" · ")}
              </p>
            ) : null}
            {trainer.bio ? (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {trainer.bio}
              </p>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  const previewSrc =
    photoPreview ?? (form.photo_url || "/images/dawg/trainers/placeholder.svg");

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-brand/40 bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-heading text-lg tracking-wide">Edit trainer</h3>
        <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
          Cancel
        </Button>
      </div>
      <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-lg bg-secondary sm:mx-0">
        <Image
          src={previewSrc}
          alt={`Photo of ${form.name}`}
          fill
          className="object-cover"
          sizes="96px"
          unoptimized={previewSrc.startsWith("blob:")}
        />
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
        disabled={loading || deleting}
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
