"use client";

import { BookingForm } from "@/components/public/booking-form";
import type { SessionWithRelations } from "@/lib/types/database";

export function BookSessionGate({
  session,
  waitlistMode = false,
}: {
  session: SessionWithRelations;
  waitlistMode?: boolean;
}) {
  return <BookingForm session={session} waitlistMode={waitlistMode} />;
}
