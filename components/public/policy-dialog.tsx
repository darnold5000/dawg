"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  getPolicyDoc,
  type PolicyDocId,
} from "@/lib/agreements";
import { useIsMobile } from "@/lib/use-is-mobile";

export function PolicyLinkButton({
  docId,
  cancellationText,
  children,
  className,
}: {
  docId: PolicyDocId;
  cancellationText?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const doc = getPolicyDoc(docId, cancellationText);

  return (
    <>
      <button
        type="button"
        className={
          className ??
          "underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        }
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {children}
      </button>

      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[85vh] gap-0 rounded-t-2xl p-0"
            showCloseButton
          >
            <SheetHeader className="border-b border-border px-4 pb-3 pt-4">
              <SheetTitle>{doc.title}</SheetTitle>
              <SheetDescription>
                Review this policy, then close to continue booking.
              </SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-4 py-4">
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                {doc.paragraphs.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </div>
            </div>
            <SheetFooter className="border-t border-border">
              <Button type="button" className="w-full" onClick={() => setOpen(false)}>
                Close
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="max-h-[80vh] max-w-lg overflow-hidden sm:max-w-lg"
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle>{doc.title}</DialogTitle>
              <DialogDescription>
                Review this policy, then close to continue booking.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[50vh] overflow-y-auto pr-1">
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                {doc.paragraphs.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </div>
            </div>
            <DialogFooter showCloseButton />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
