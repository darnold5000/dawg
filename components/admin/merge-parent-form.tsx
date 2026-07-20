"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MergeParentForm({
  canonicalParentId,
}: {
  canonicalParentId: string;
}) {
  const router = useRouter();
  const [duplicateId, setDuplicateId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!duplicateId.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/clients/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonicalParentId,
          duplicateParentId: duplicateId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Merge failed");
        return;
      }
      toast.success(
        `Merged ${data.movedPurchases} purchase(s), ${data.movedBookings} booking(s), ${data.movedAthletes} athlete(s).`,
      );
      setDuplicateId("");
      router.refresh();
    } catch {
      toast.error("Merge failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <p className="font-medium">Merge duplicate account</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Move athletes, bookings, package purchases, intake, and history from a
          duplicate parent record into this account, then delete the duplicate.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="duplicateParentId">Duplicate parent ID</Label>
        <Input
          id="duplicateParentId"
          value={duplicateId}
          onChange={(e) => setDuplicateId(e.target.value)}
          placeholder="UUID of the duplicate parent to merge in"
        />
      </div>
      <Button type="submit" variant="outline" disabled={submitting}>
        {submitting ? "Merging…" : "Merge into this account"}
      </Button>
    </form>
  );
}
