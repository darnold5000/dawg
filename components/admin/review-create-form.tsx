"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export function ReviewCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    reviewer_name: "",
    reviewer_description: "",
    athlete_sport: "",
    rating: "5",
    review_text: "",
    published: false,
    featured: false,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rating: Number(form.rating),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save review");
        return;
      }
      toast.success("Review saved");
      setForm({
        reviewer_name: "",
        reviewer_description: "",
        athlete_sport: "",
        rating: "5",
        review_text: "",
        published: false,
        featured: false,
      });
      router.refresh();
    } catch {
      toast.error("Could not save review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h3 className="font-heading text-xl tracking-wide">Add review</h3>
      <p className="text-xs text-muted-foreground">
        Only publish authentic reviews approved by DAWG. Check &quot;Publish
        publicly&quot; to show the review on the home page.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reviewer_name">Reviewer name</Label>
          <Input
            id="reviewer_name"
            required
            value={form.reviewer_name}
            onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reviewer_description">Relationship</Label>
          <Input
            id="reviewer_description"
            placeholder="Parent of a 10U athlete"
            value={form.reviewer_description}
            onChange={(e) =>
              setForm({ ...form, reviewer_description: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rating">Rating</Label>
          <Input
            id="rating"
            type="number"
            min={1}
            max={5}
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="athlete_sport">Sport (optional)</Label>
          <Input
            id="athlete_sport"
            value={form.athlete_sport}
            onChange={(e) => setForm({ ...form, athlete_sport: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="review_text">Review</Label>
          <Textarea
            id="review_text"
            required
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
        disabled={loading}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {loading ? "Saving…" : "Save review"}
      </Button>
    </form>
  );
}
