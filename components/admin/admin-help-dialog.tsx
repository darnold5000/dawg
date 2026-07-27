"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_GUIDE_SECTIONS } from "@/lib/help/admin-guide";

function GuideBody({
  sectionId,
}: {
  sectionId: (typeof ADMIN_GUIDE_SECTIONS)[number]["id"];
}) {
  const section = ADMIN_GUIDE_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return null;

  return (
    <div className="max-h-[min(60vh,28rem)] overflow-y-auto pr-1">
      <p className="text-sm text-muted-foreground">{section.intro}</p>
      <div className="mt-4 space-y-5">
        {section.blocks.map((block, i) => (
          <div key={`${section.id}-block-${i}`}>
            {block.heading ? (
              <h3 className="font-medium text-foreground">{block.heading}</h3>
            ) : null}
            <div
              className={
                block.heading ? "mt-2 space-y-2" : "space-y-2"
              }
            >
              {block.paragraphs?.map((p) => (
                <p
                  key={p.slice(0, 48)}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {p}
                </p>
              ))}
              {block.bullets && block.bullets.length > 0 ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                  {block.bullets.map((b) => (
                    <li key={b.slice(0, 48)}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminHelpDialog() {
  const [open, setOpen] = useState(false);
  const defaultTab = ADMIN_GUIDE_SECTIONS[0]?.id ?? "dashboard";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-border bg-white shadow-sm"
        onClick={() => setOpen(true)}
      >
        <CircleHelp className="mr-2 h-4 w-4" />
        Help
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(92vh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="font-heading text-xl tracking-wide">
              Staff guide
            </DialogTitle>
            <DialogDescription>
              How bookings, payments, rosters, clients, and credits work in
              DAWG Admin.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={defaultTab} className="min-h-0 flex-1 gap-0">
            <div className="border-b border-border px-5 py-3">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
                {ADMIN_GUIDE_SECTIONS.map((section) => (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className="px-2.5 py-1 text-xs sm:text-sm"
                  >
                    {section.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {ADMIN_GUIDE_SECTIONS.map((section) => (
              <TabsContent
                key={section.id}
                value={section.id}
                className="px-5 py-4"
              >
                <GuideBody sectionId={section.id} />
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
