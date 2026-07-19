"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BookingRetryButton({
  bookingId,
  token,
}: {
  bookingId: string;
  token: string;
}) {
  const [loading, setLoading] = useState(false);

  async function onRetry() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not restart checkout");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      toast.error("Could not restart checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={onRetry}
      disabled={loading}
      className="bg-brand text-brand-foreground hover:bg-brand/90"
    >
      {loading ? "Starting…" : "Retry payment"}
    </Button>
  );
}
