"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteSessionButton({
  sessionId,
  title,
  bookedCount,
}: {
  sessionId: string;
  title: string;
  bookedCount: number;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    const warning =
      bookedCount > 0
        ? `Delete "${title}"? This will also remove ${bookedCount} booking${bookedCount === 1 ? "" : "s"} linked to this session.`
        : `Delete "${title}"? This cannot be undone.`;
    if (!window.confirm(warning)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not delete session");
        return;
      }
      toast.success("Session deleted");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
      disabled={deleting}
      onClick={onDelete}
    >
      {deleting ? "Deleting…" : "Delete"}
    </Button>
  );
}
