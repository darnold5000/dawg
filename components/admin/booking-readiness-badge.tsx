import { cn } from "@/lib/utils";
import type { AthleteBookingReadinessStatus } from "@/lib/intake";

const config: Record<
  AthleteBookingReadinessStatus,
  { label: string; className: string }
> = {
  ready: {
    label: "Booking Ready",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  waiver_update: {
    label: "Waiver Update Needed",
    className: "border-amber-200 bg-amber-50 text-amber-950",
  },
  intake_missing: {
    label: "Intake Missing",
    className: "border-red-200 bg-red-50 text-red-900",
  },
};

const emoji: Record<AthleteBookingReadinessStatus, string> = {
  ready: "🟢",
  waiver_update: "🟡",
  intake_missing: "🔴",
};

export function BookingReadinessBadge({
  status,
  className,
}: {
  status: AthleteBookingReadinessStatus;
  className?: string;
}) {
  const { label, className: tone } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide",
        tone,
        className,
      )}
      title={label}
    >
      <span aria-hidden>{emoji[status]}</span>
      {label}
    </span>
  );
}
