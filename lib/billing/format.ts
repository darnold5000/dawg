/**
 * Shared billing formatters / table chrome helpers.
 * Adapted from @signalworks/billing admin utils (formatMoney, formatDate, cn).
 */

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Format integer cents as currency. */
export function formatMoney(
  cents: number,
  currency = "USD",
  options?: { maximumFractionDigits?: number },
) {
  const fractionDigits =
    options?.maximumFractionDigits ?? (cents % 100 === 0 ? 0 : 2);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: fractionDigits,
  }).format(cents / 100);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Convert dollars (form input) to integer cents. */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Convert integer cents to dollars for form inputs. */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

export const billingTableClassNames = {
  page: "space-y-4",
  title: "text-xl font-semibold",
  tableWrap: "overflow-x-auto border border-neutral-200",
  table: "min-w-full text-left text-sm",
  tableHead: "bg-neutral-50 text-xs uppercase text-neutral-500",
  tableRow: "border-t border-neutral-200",
} as const;
