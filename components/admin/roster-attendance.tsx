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
import { cn } from "@/lib/utils";

const toneClass = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  danger: "border-red-300 bg-red-50 text-red-900",
  neutral: "border-border bg-background text-foreground",
} as const;

export function RosterAttendance({
  bookings,
}: {
  bookings: BookingWithRelations[];
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
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not update attendance");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => {
        const status = (b.attendance_status ?? "registered") as AttendanceStatus;
        const busy = pendingId === b.id || isPending;
        const age = b.athlete?.date_of_birth
          ? athleteAgeFromDob(b.athlete.date_of_birth)
          : null;

        return (
          <article
            key={b.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold leading-tight">
                  {b.athlete?.first_name} {b.athlete?.last_name}
                  {age != null ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      Age {age}
                    </span>
                  ) : null}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {b.parent?.first_name} {b.parent?.last_name}
                  {b.parent?.phone ? ` · ${b.parent.phone}` : ""}
                </p>
                {b.parent?.email ? (
                  <p className="text-xs text-muted-foreground">{b.parent.email}</p>
                ) : null}
              </div>
              <PaymentStatusBadge status={b.payment_status} />
            </div>

            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Attendance
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ATTENDANCE_STATUSES.map((option) => {
                const active = status === option;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={busy}
                    onClick={() => setAttendance(b.id, option)}
                    className={cn(
                      "min-h-11 rounded-lg border px-2 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60",
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
