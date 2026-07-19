import { CURRENT_AGREEMENTS_VERSION } from "@/lib/agreements";
import { formatDate } from "@/lib/billing/format";

type AgreementsFields = {
  agreements_version?: string | null;
  agreements_accepted_at?: string | null;
  waiver_acknowledged_at?: string | null;
  media_consent?: boolean | null;
};

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return formatDate(iso);
  } catch {
    return iso;
  }
}

export function AgreementsSummary({
  booking,
  compact = false,
}: {
  booking: AgreementsFields;
  compact?: boolean;
}) {
  const version = booking.agreements_version?.trim() || null;
  const acceptedAt =
    booking.agreements_accepted_at || booking.waiver_acknowledged_at || null;
  const isCurrent = version === CURRENT_AGREEMENTS_VERSION;

  if (compact) {
    if (!version && !acceptedAt) return <span>—</span>;
    return (
      <span className="text-sm">
        <span className="font-medium">{version ?? "unknown"}</span>
        {acceptedAt ? (
          <span className="block text-xs text-muted-foreground">
            {formatWhen(acceptedAt)}
          </span>
        ) : null}
        {version && !isCurrent ? (
          <span className="mt-0.5 block text-xs text-amber-700">
            Outdated vs current
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Agreements & consent
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Checkbox acknowledgments from booking — not uploaded signed PDFs.
      </p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Policy version accepted</dt>
          <dd className="font-medium">{version ?? "—"}</dd>
          {version ? (
            <dd
              className={
                isCurrent
                  ? "mt-0.5 text-xs text-emerald-700"
                  : "mt-0.5 text-xs text-amber-700"
              }
            >
              {isCurrent
                ? `Matches current (${CURRENT_AGREEMENTS_VERSION})`
                : `Current site version is ${CURRENT_AGREEMENTS_VERSION}`}
            </dd>
          ) : null}
        </div>
        <div>
          <dt className="text-muted-foreground">Accepted on</dt>
          <dd className="font-medium">{formatWhen(acceptedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Waiver acknowledged</dt>
          <dd className="font-medium">
            {booking.waiver_acknowledged_at
              ? formatWhen(booking.waiver_acknowledged_at)
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Photo / media consent</dt>
          <dd className="font-medium">
            {booking.media_consent == null
              ? "—"
              : booking.media_consent
                ? "Yes"
                : "No"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
