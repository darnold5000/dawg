"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ATTENDANCE_STATUSES,
  attendanceLabel,
  attendanceTone,
} from "@/lib/attendance";
import type { AttendanceStatus, BookingWithRelations } from "@/lib/types/database";
import { athleteAgeFromDob } from "@/lib/format";
import { PaymentStatusBadge } from "@/components/admin/billing/payment-status-badge";
import { BookingReadinessBadge } from "@/components/admin/booking-readiness-badge";
import type { AthleteBookingReadinessStatus } from "@/lib/intake";
import { cn } from "@/lib/utils";

const toneClass = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  danger: "border-red-300 bg-red-50 text-red-900",
  neutral: "border-border bg-background text-foreground",
} as const;

export function RosterAttendance({
  bookings,
  readinessByAthleteId = {},
}: {
  bookings: BookingWithRelations[];
  readinessByAthleteId?: Record<string, AthleteBookingReadinessStatus>;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function setAttendance(bookingId: string, status: AttendanceStatus) {
    setPendingId(bookingId);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceStatus: status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update attendance");
        return;
      }
      toast.success(`Marked ${attendanceLabel(status).toLowerCase()}`);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not update attendance");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {bookings.map((b) => {
        const status = (b.attendance_status ?? "registered") as AttendanceStatus;
        const busy = pendingId === b.id || isPending;
        const age = b.athlete?.date_of_birth
          ? athleteAgeFromDob(b.athlete.date_of_birth)
          : null;

        const readiness =
          b.athlete_id && readinessByAthleteId[b.athlete_id]
            ? readinessByAthleteId[b.athlete_id]
            : "intake_missing";

        return (
          <article
            key={b.id}
            className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold leading-snug">
                  {b.athlete?.first_name} {b.athlete?.last_name}
                  {age != null ? (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      Age {age}
                    </span>
                  ) : null}
                </h3>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {b.parent?.first_name} {b.parent?.last_name}
                  {b.parent?.phone ? ` · ${b.parent.phone}` : ""}
                  {b.parent?.email ? ` · ${b.parent.email}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                <BookingReadinessBadge status={readiness} />
                <PaymentStatusBadge status={b.payment_status} />
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {ATTENDANCE_STATUSES.map((option) => {
                const active = status === option;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={busy}
                    onClick={() => setAttendance(b.id, option)}
                    className={cn(
                      "min-h-9 flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 sm:flex-none sm:min-w-[5.5rem]",
                      active
                        ? toneClass[attendanceTone(option)]
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {attendanceLabel(option)}
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
