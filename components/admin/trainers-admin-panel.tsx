"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  TrainerCreateForm,
  TrainerEditCard,
} from "@/components/admin/trainer-forms";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Trainer } from "@/lib/types/database";

export function TrainersAdminPanel({ trainers }: { trainers: Trainer[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  function onCreated() {
    setAddOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-xl tracking-wide">Current trainers</h3>
        <Button
          type="button"
          size="sm"
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-4" />
          Add trainer
        </Button>
      </div>

      {trainers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No trainers yet.</p>
      ) : (
        <div className="grid gap-4">
          {trainers.map((trainer) => (
            <TrainerEditCard key={trainer.id} trainer={trainer} />
          ))}
        </div>
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add trainer</SheetTitle>
            <SheetDescription>
              New trainers appear on the home page and About page when marked
              active.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <TrainerCreateForm embedded onSuccess={onCreated} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
