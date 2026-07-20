import { cn } from "@/lib/billing/format";
import { paymentStatusTone } from "@/lib/billing/types";
import { adminPaymentStatusLabel } from "@/lib/admin-booking-labels";
import type { PaymentStatus } from "@/lib/types/database";

const toneClass: Record<string, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-red-200 bg-red-50 text-red-900",
  info: "border-sky-200 bg-sky-50 text-sky-950",
  neutral: "border-neutral-200 bg-neutral-50 text-neutral-800",
};

function label(status: PaymentStatus): string {
  return adminPaymentStatusLabel(status);
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const tone = paymentStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold capitalize tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      {label(status)}
    </span>
  );
}
