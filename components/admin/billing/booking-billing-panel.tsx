"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PaymentStatusBadge } from "@/components/admin/billing/payment-status-badge";
import { Button } from "@/components/ui/button";
import {
  billingTableClassNames,
  formatDate,
  formatMoney,
} from "@/lib/billing/format";
import type { Booking, PaymentTransaction } from "@/lib/types/database";
import { adminBookingPaymentTypeLabel } from "@/lib/admin-booking-display";

export function BookingBillingPanel({
  booking,
  transactions,
  paymentTypeLabel,
}: {
  booking: Booking;
  transactions: PaymentTransaction[];
  paymentTypeLabel?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function markPaid() {
    setBusy("paid");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not mark paid");
        return;
      }
      toast.success("Marked paid");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function markUnpaid() {
    setBusy("unpaid");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_unpaid" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not mark unpaid");
        return;
      }
      toast.success("Marked unpaid");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function syncStripe() {
    setBusy("sync");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/sync-stripe`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not sync from Stripe");
        return;
      }
      if (data.confirmed) {
        toast.success("Synced — booking marked paid");
      } else {
        toast.message("Stripe session is not paid yet");
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function refund() {
    if (
      !window.confirm(
        "Issue a full Stripe refund for this booking? This cannot be undone from the app.",
      )
    ) {
      return;
    }
    setBusy("refund");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelBooking: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Refund failed");
        return;
      }
      toast.success("Refund issued");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const currency = booking.currency?.toUpperCase() || "USD";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl tracking-wide">Billing</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Payment method, status, and Stripe references
            </p>
          </div>
          <PaymentStatusBadge status={booking.payment_status} />
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Payment type
            </dt>
            <dd className="mt-0.5 font-medium">
              {paymentTypeLabel ??
                adminBookingPaymentTypeLabel({
                  paymentStatus: booking.payment_status,
                  paymentMethod: booking.payment_method,
                })}
            </dd>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Paid at
            </dt>
            <dd className="mt-0.5 font-medium">
              {booking.paid_at ? formatDate(booking.paid_at) : "—"}
            </dd>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Amount due
            </dt>
            <dd className="mt-0.5 text-lg font-semibold">
              {formatMoney(booking.amount_due_cents, currency)}
            </dd>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Amount paid
            </dt>
            <dd className="mt-0.5 text-lg font-semibold">
              {formatMoney(booking.amount_paid_cents, currency)}
            </dd>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2.5 sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Refunded
            </dt>
            <dd className="mt-0.5 font-medium">
              {formatMoney(booking.amount_refunded_cents, currency)}
            </dd>
          </div>
        </dl>

        <div className="mt-5 space-y-2 border-t border-border pt-4 text-xs">
          <p className="font-medium text-muted-foreground">Stripe IDs</p>
          <p className="break-all font-mono">
            <span className="text-muted-foreground">Checkout: </span>
            {booking.stripe_checkout_session_id ?? "—"}
          </p>
          <p className="break-all font-mono">
            <span className="text-muted-foreground">Payment intent: </span>
            {booking.stripe_payment_intent_id ?? "—"}
          </p>
          <p className="break-all font-mono">
            <span className="text-muted-foreground">Charge: </span>
            {booking.stripe_charge_id ?? "—"}
          </p>
          {booking.payment_failure_message ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {booking.payment_failure_message}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {booking.payment_status !== "not_required" &&
          booking.payment_method === "pay_at_facility" ? (
            <>
              <Button
                type="button"
                size="sm"
                className="min-h-10"
                disabled={busy !== null || booking.payment_status === "paid"}
                onClick={markPaid}
              >
                {busy === "paid" ? "Saving…" : "Mark paid"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-10"
                disabled={busy !== null || booking.payment_status === "unpaid"}
                onClick={markUnpaid}
              >
                {busy === "unpaid" ? "Saving…" : "Mark unpaid"}
              </Button>
            </>
          ) : null}
          {booking.payment_method === "stripe" &&
          booking.payment_status !== "paid" &&
          booking.payment_status !== "refunded" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-10"
              disabled={busy !== null || !booking.stripe_checkout_session_id}
              onClick={syncStripe}
            >
              {busy === "sync" ? "Syncing…" : "Sync from Stripe"}
            </Button>
          ) : null}
          {booking.payment_method === "stripe" &&
          (booking.payment_status === "paid" ||
            booking.payment_status === "partially_refunded") ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="min-h-10"
              disabled={busy !== null}
              onClick={refund}
            >
              {busy === "refund" ? "Refunding…" : "Full refund"}
            </Button>
          ) : null}
        </div>
      </section>

      <section className={billingTableClassNames.page}>
        <div>
          <h3 className={billingTableClassNames.title}>Transactions</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Payments, refunds, and facility adjustments
          </p>
        </div>
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            No transactions recorded yet.
          </div>
        ) : (
          <div className={billingTableClassNames.tableWrap}>
            <table className={billingTableClassNames.table}>
              <thead className={billingTableClassNames.tableHead}>
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Reference</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className={billingTableClassNames.tableRow}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="px-4 py-3 capitalize">{tx.transaction_type}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatMoney(tx.amount_cents, tx.currency.toUpperCase())}
                    </td>
                    <td className="px-4 py-3 capitalize">{tx.status}</td>
                    <td className="hidden max-w-[12rem] truncate px-4 py-3 font-mono text-xs text-muted-foreground sm:table-cell">
                      {tx.stripe_refund_id ||
                        tx.stripe_payment_intent_id ||
                        tx.stripe_charge_id ||
                        "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
