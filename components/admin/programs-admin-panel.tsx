"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  ProgramCreateForm,
  ProgramEditCard,
} from "@/components/admin/program-forms";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Program } from "@/lib/types/database";

export function ProgramsAdminPanel({ programs }: { programs: Program[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  function onCreated() {
    setAddOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-xl tracking-wide">Your programs</h3>
        <Button
          type="button"
          size="sm"
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-4" />
          Add program
        </Button>
      </div>

      {programs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No programs yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {programs.map((program) => (
            <ProgramEditCard key={program.id} program={program} />
          ))}
        </div>
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add program</SheetTitle>
            <SheetDescription>
              Group programs appear on the public site and in Classes when you
              schedule them.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <ProgramCreateForm embedded onSuccess={onCreated} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
