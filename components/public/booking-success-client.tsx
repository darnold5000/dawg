"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Poll while webhook confirmation is still in flight. */
export function BookingSuccessPoller({
  confirming,
}: {
  confirming: boolean;
}) {
  const router = useRouter();
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    if (!confirming) return;
    if (ticks >= 12) return;
    const id = window.setTimeout(() => {
      setTicks((t) => t + 1);
      router.refresh();
    }, 2500);
    return () => window.clearTimeout(id);
  }, [confirming, ticks, router]);

  if (!confirming) return null;

  return (
    <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      Confirming your booking and sending your email
      {ticks > 0 ? "…" : "."} This usually takes a few seconds.
    </p>
  );
}
