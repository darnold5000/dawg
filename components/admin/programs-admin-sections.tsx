"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AvailabilityTool } from "@/components/admin/availability-tool";
import { SessionForm } from "@/components/admin/session-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Program, SessionType, Trainer } from "@/lib/types/database";

function CollapsibleSection({
  id,
  title,
  description,
  children,
  defaultOpen = false,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-xl border border-border bg-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h3 className="font-heading text-xl tracking-wide">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? "Hide form" : "Create"}
          <ChevronDown
            className={cn(
              "ml-2 h-4 w-4 transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
      </div>
      {open ? <div className="border-t border-border p-5">{children}</div> : null}
    </section>
  );
}

export function ProgramsAdminSections({
  programs,
  sessionTypes,
  trainers,
}: {
  programs: Program[];
  sessionTypes: SessionType[];
  trainers: Trainer[];
}) {
  return (
    <div className="space-y-4">
      <CollapsibleSection
        id="private-lessons"
        title="Private lessons"
        description="Generate bookable one-on-one slots with a Stripe price. Parents pay online when booking."
      >
        <AvailabilityTool trainers={trainers} />
      </CollapsibleSection>

      <CollapsibleSection
        id="paid-one-off"
        title="Paid one-off class"
        description="Add a special class session with a dollar amount charged through Stripe at booking."
      >
        <SessionForm
          programs={programs}
          sessionTypes={sessionTypes}
          trainers={trainers}
          variant="paid-one-off"
        />
      </CollapsibleSection>
    </div>
  );
}
