import { cn, paymentStatusTone } from "@/lib/billing";
import type { PaymentStatus } from "@/lib/types/database";

const toneClass: Record<string, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
  info: "border-sky-200 bg-sky-50 text-sky-900",
  neutral: "border-neutral-200 bg-neutral-50 text-neutral-700",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const tone = paymentStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold capitalize",
        toneClass[tone],
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
