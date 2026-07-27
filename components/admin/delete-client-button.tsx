"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteClientButton({
  parentId,
  parentName,
  bookingCount,
  athleteCount,
}: {
  parentId: string;
  parentName: string;
  bookingCount: number;
  athleteCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onConfirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/clients/${parentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not delete client");
        return;
      }
      toast.success("Client deleted");
      setOpen(false);
      router.push("/admin/clients");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  const bookingLine =
    bookingCount > 0
      ? `${bookingCount} booking${bookingCount === 1 ? "" : "s"}`
      : null;
  const athleteLine =
    athleteCount > 0
      ? `${athleteCount} athlete${athleteCount === 1 ? "" : "s"}`
      : null;
  const detailParts = [bookingLine, athleteLine].filter(Boolean);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-2 size-4" />
        Delete client
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Delete client?</DialogTitle>
            <DialogDescription>
              This permanently removes {parentName} from your client list. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            {detailParts.length > 0 ? (
              <p>
                Also removed: {detailParts.join(" and ")} on file, package
                purchases, intake records, and saved device info for this
                family.
              </p>
            ) : (
              <p>
                Also removed: package purchases, intake records, and saved device
                info linked to this family.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void onConfirmDelete()}
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
