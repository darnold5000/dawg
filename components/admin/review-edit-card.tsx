"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Review } from "@/lib/types/database";

function reviewToForm(review: Review) {
  return {
    reviewer_name: review.reviewer_name,
    reviewer_description: review.reviewer_description ?? "",
    athlete_sport: review.athlete_sport ?? "",
    rating: String(review.rating),
    review_text: review.review_text,
    published: review.published,
    featured: review.featured,
    display_order: String(review.display_order),
  };
}

export function ReviewEditCard({ review }: { review: Review }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(reviewToForm(review));

  function cancelEdit() {
    setForm(reviewToForm(review));
    setEditing(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rating: Number(form.rating),
          display_order: Number(form.display_order) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save review");
        return;
      }
      toast.success(
        form.published ? "Review updated and live on site" : "Review updated (hidden)",
      );
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Could not save review");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    const confirmed = window.confirm(
      `Delete the review from ${review.reviewer_name}? This removes it from the website permanently.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not delete review");
        return;
      }
      toast.success("Review deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete review");
    } finally {
      setDeleting(false);
    }
  }

  if (!editing) {
    return (
      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={review.published ? "default" : "secondary"}>
              {review.published ? "Published" : "Hidden"}
            </Badge>
            {review.featured ? <Badge>Featured</Badge> : null}
            <Badge variant="outline">Order {review.display_order}</Badge>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Edit review"
              disabled={deleting}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Delete review"
              className="text-destructive hover:text-destructive"
              disabled={deleting}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="font-heading text-xl tracking-wide">
              {review.reviewer_name}
            </h3>
            {review.reviewer_description ? (
              <span className="text-sm text-muted-foreground">
                {review.reviewer_description}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {review.rating}/5 stars
            {review.athlete_sport ? ` · ${review.athlete_sport}` : ""}
          </p>
          <p className="text-sm leading-relaxed">{review.review_text}</p>
        </div>
      </article>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-brand/40 bg-card p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-lg tracking-wide">Edit review</h3>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`reviewer_name-${review.id}`}>Reviewer name</Label>
          <Input
            id={`reviewer_name-${review.id}`}
            required
            value={form.reviewer_name}
            onChange={(e) =>
              setForm({ ...form, reviewer_name: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`reviewer_description-${review.id}`}>
            Relationship
          </Label>
          <Input
            id={`reviewer_description-${review.id}`}
            value={form.reviewer_description}
            onChange={(e) =>
              setForm({ ...form, reviewer_description: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`rating-${review.id}`}>Rating</Label>
          <Input
            id={`rating-${review.id}`}
            type="number"
            min={1}
            max={5}
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`athlete_sport-${review.id}`}>Sport (optional)</Label>
          <Input
            id={`athlete_sport-${review.id}`}
            value={form.athlete_sport}
            onChange={(e) =>
              setForm({ ...form, athlete_sport: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`display_order-${review.id}`}>Display order</Label>
          <Input
            id={`display_order-${review.id}`}
            type="number"
            min={0}
            value={form.display_order}
            onChange={(e) =>
              setForm({ ...form, display_order: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`review_text-${review.id}`}>Review</Label>
          <Textarea
            id={`review_text-${review.id}`}
            required
            rows={4}
            value={form.review_text}
            onChange={(e) => setForm({ ...form, review_text: e.target.value })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.published}
          onCheckedChange={(v) => setForm({ ...form, published: Boolean(v) })}
        />
        Publish on website (home page reviews section)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.featured}
          onCheckedChange={(v) => setForm({ ...form, featured: Boolean(v) })}
        />
        Featured
      </label>

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
