"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { REMOVE_FROM_SESSION_CONFIRMATION } from "@/lib/booking-roster";

export function BookingLifecycleActions({
  bookingId,
  canRemove,
  removeDisabledReason,
  compact = false,
  afterRemoveHref,
  showRemove = true,
}: {
  bookingId: string;
  canRemove: boolean;
  removeDisabledReason?: string | null;
  compact?: boolean;
  afterRemoveHref?: string;
  showRemove?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"cancel" | "remove" | null>(null);
  const [isPending, startTransition] = useTransition();

  async function cancelBooking() {
    if (
      !window.confirm(
        "Cancel this booking?\n\nIt will stay in booking history but will no longer count on the session roster.",
      )
    ) {
      return;
    }
    setBusy("cancel");
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not cancel booking");
        return;
      }
      toast.success("Booking cancelled");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not cancel booking");
    } finally {
      setBusy(null);
    }
  }

  async function removeBooking() {
    if (!canRemove) {
      toast.error(
        removeDisabledReason ??
          "This booking cannot be permanently removed.",
      );
      return;
    }
    if (!window.confirm(REMOVE_FROM_SESSION_CONFIRMATION)) {
      return;
    }
    setBusy("remove");
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/remove`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not remove booking");
        return;
      }
      toast.success("Removed from session");
      if (afterRemoveHref) {
        router.push(afterRemoveHref);
      }
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not remove booking");
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy != null || isPending;

  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => void cancelBooking()}
      >
        {busy === "cancel" ? "Cancelling…" : "Cancel booking"}
      </Button>
      {showRemove ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canRemove}
          title={
            !canRemove
              ? (removeDisabledReason ?? "Paid bookings cannot be removed")
              : undefined
          }
          onClick={() => void removeBooking()}
        >
          {busy === "remove" ? "Removing…" : "Remove from session"}
        </Button>
      ) : null}
    </div>
  );
}
