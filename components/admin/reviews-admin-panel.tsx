"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ReviewCreateForm } from "@/components/admin/review-create-form";
import { ReviewEditCard } from "@/components/admin/review-edit-card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Review } from "@/lib/types/database";

export function ReviewsAdminPanel({ reviews }: { reviews: Review[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  function onCreated() {
    setAddOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-xl tracking-wide">Current reviews</h3>
        <Button
          type="button"
          size="sm"
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-4" />
          Add review
        </Button>
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews stored yet.</p>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <ReviewEditCard key={review.id} review={review} />
          ))}
        </div>
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add review</SheetTitle>
            <SheetDescription>
              Only publish authentic reviews approved by DAWG.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <ReviewCreateForm embedded onSuccess={onCreated} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
