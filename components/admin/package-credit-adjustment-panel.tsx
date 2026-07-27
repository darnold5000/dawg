"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/billing/format";
import { PACKAGE_CATALOG_SEED_HINT } from "@/lib/package-catalog-hints";
import type {
  PackageCreditAdjustment,
  PackagePurchaseWithPackage,
  TrainingPackage,
} from "@/lib/types/database";

type AthleteOption = {
  id: string;
  first_name: string;
  last_name: string;
};

type Mode = "grant" | "add" | "remove";

export function PackageCreditAdjustmentPanel({
  parentId,
  purchases,
  athletes,
  packages,
  adjustments,
}: {
  parentId: string;
  purchases: PackagePurchaseWithPackage[];
  athletes: AthleteOption[];
  packages: TrainingPackage[];
  adjustments: PackageCreditAdjustment[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("grant");
  const [packageSlug, setPackageSlug] = useState<
    "single" | "pack-10" | "pack-20"
  >("single");
  const [sessionCount, setSessionCount] = useState("");
  const [purchaseId, setPurchaseId] = useState(purchases[0]?.id ?? "");
  const [amount, setAmount] = useState("1");
  const [athleteId, setAthleteId] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const selectedPackage = packages.find((p) => p.slug === packageSlug);

  const reasonOk = reason.trim().length >= 10;
  const canApply =
    confirmed &&
    reasonOk &&
    (mode === "grant"
      ? packages.length > 0
      : purchases.length > 0 && purchaseId);

  async function syncAttendedCredits() {
    setSyncing(true);
    try {
      const res = await fetch(
        `/api/admin/clients/${parentId}/package-credits/sync`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not sync credits");
        return;
      }
      if (data.redeemed > 0) {
        toast.success(
          `Applied ${data.redeemed} credit${data.redeemed === 1 ? "" : "s"} for attended sessions`,
        );
      } else {
        toast.message("No missing credit deductions found for attended sessions");
      }
      router.refresh();
    } catch {
      toast.error("Could not sync credits");
    } finally {
      setSyncing(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reasonOk) {
      toast.error("Enter a reason (at least 10 characters)");
      return;
    }
    if (!confirmed) {
      toast.error("Check the confirmation box before applying");
      return;
    }
    if (mode === "grant" && packages.length === 0) {
      toast.error(`No packages in catalog. ${PACKAGE_CATALOG_SEED_HINT}`);
      return;
    }
    if (mode !== "grant" && purchases.length === 0) {
      toast.error("No package on file to adjust — use Grant new credits");
      return;
    }

    setSubmitting(true);
    try {
      const body =
        mode === "grant"
          ? {
              action: "grant" as const,
              packageSlug,
              sessionCount: sessionCount
                ? Number.parseInt(sessionCount, 10)
                : undefined,
              athleteId: athleteId || null,
              reason: reason.trim(),
            }
          : {
              action: mode,
              purchaseId,
              amount: Number.parseInt(amount, 10),
              reason: reason.trim(),
            };

      const res = await fetch(
        `/api/admin/clients/${parentId}/package-credits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update credits");
        return;
      }

      toast.success(
        `Credits updated · ${data.purchase.sessions_remaining} / ${data.purchase.sessions_total} remaining`,
      );
      setReason("");
      setConfirmed(false);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not update credits");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="rounded-xl border border-amber-300 bg-amber-50/50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-800" />
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-xl tracking-wide text-amber-950">
              Session credits (owner / admin)
            </h3>
            <p className="mt-1 text-sm text-amber-900/80">
              Group classes deduct one package credit when staff marks{" "}
              <strong>Attended</strong> on the session roster. Use these tools to
              grant credits, fix a balance, or backfill credits for sessions
              already marked attended.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-amber-400 bg-white hover:bg-amber-50"
                disabled={syncing}
                onClick={() => void syncAttendedCredits()}
              >
                {syncing ? "Syncing…" : "Apply credits for attended sessions"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-amber-400 bg-white hover:bg-amber-50"
                onClick={() => setOpen(true)}
              >
                Add or remove credits…
              </Button>
            </div>
          </div>
        </div>

        {adjustments.length > 0 ? (
          <div className="mt-5 border-t border-amber-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/70">
              Recent adjustments
            </p>
            <ul className="mt-2 space-y-2 text-sm text-amber-950">
              {adjustments.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2"
                >
                  <p className="font-medium">
                    {row.action === "grant"
                      ? "Granted"
                      : row.action === "add"
                        ? "Added"
                        : "Removed"}{" "}
                    {Math.abs(row.delta)} session
                    {Math.abs(row.delta) === 1 ? "" : "s"}
                    {row.purchase?.package?.name
                      ? ` · ${row.purchase.package.name}`
                      : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-900/70">
                    {formatDate(row.created_at)}
                    {row.staff?.full_name ? ` · ${row.staff.full_name}` : ""}
                    {row.sessions_before != null && row.sessions_after != null
                      ? ` · ${row.sessions_before} → ${row.sessions_after}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-amber-900/80">{row.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="admin-app flex w-full flex-col gap-0 border-slate-200 bg-white p-0 text-slate-900 sm:max-w-lg"
        >
          <form
            onSubmit={onSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <SheetHeader className="border-b border-slate-200 px-6 py-5 text-left">
              <SheetTitle className="text-slate-900">
                Adjust package credits
              </SheetTitle>
              <SheetDescription className="text-slate-600">
                Changes the family&apos;s session balance immediately. Confirm
                the client and amount before saving.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {packages.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  Package catalog is empty for this tenant. {PACKAGE_CATALOG_SEED_HINT}
                </p>
              ) : null}
              <div className="space-y-2">
                <Label className="text-slate-800">What do you need to do?</Label>
                <div className="grid gap-2">
                  {(
                    [
                      ["grant", "Grant new credits (new package record)"],
                      ["add", "Add sessions to existing package"],
                      ["remove", "Remove sessions from existing package"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                        mode === value
                          ? "border-brand bg-blue-50/80"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value={value}
                        checked={mode === value}
                        onChange={() => setMode(value)}
                        className="mt-0.5"
                      />
                      <span className="text-slate-800">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {mode === "grant" ? (
                <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="packageSlug">Package type</Label>
                    <select
                      id="packageSlug"
                      value={packageSlug}
                      onChange={(e) =>
                        setPackageSlug(
                          e.target.value as "single" | "pack-10" | "pack-20",
                        )
                      }
                      className="form-select bg-white"
                    >
                      {packages.length === 0 ? (
                        <option value="single">No packages in catalog</option>
                      ) : (
                        packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.slug}>
                            {pkg.name} ({pkg.session_count} sessions)
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sessionCount">
                      Session count (optional override)
                    </Label>
                    <Input
                      id="sessionCount"
                      type="number"
                      min={1}
                      max={100}
                      placeholder={
                        selectedPackage
                          ? String(selectedPackage.session_count)
                          : "Default from package"
                      }
                      value={sessionCount}
                      onChange={(e) => setSessionCount(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  {athletes.length > 0 ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="athleteId">Athlete (optional)</Label>
                      <select
                        id="athleteId"
                        value={athleteId}
                        onChange={(e) => setAthleteId(e.target.value)}
                        className="form-select bg-white"
                      >
                        <option value="">Family-wide</option>
                        {athletes.map((athlete) => (
                          <option key={athlete.id} value={athlete.id}>
                            {athlete.first_name} {athlete.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="purchaseId">Existing package</Label>
                    <select
                      id="purchaseId"
                      value={purchaseId}
                      onChange={(e) => setPurchaseId(e.target.value)}
                      className="form-select bg-white"
                      required
                    >
                      {purchases.length === 0 ? (
                        <option value="">No purchases on file</option>
                      ) : (
                        purchases.map((purchase) => (
                          <option key={purchase.id} value={purchase.id}>
                            {purchase.package?.name ?? "Package"} ·{" "}
                            {purchase.sessions_remaining} /{" "}
                            {purchase.sessions_total} left
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="amount">Number of sessions</Label>
                    <Input
                      id="amount"
                      type="number"
                      min={1}
                      max={100}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason (required)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={10}
                  rows={3}
                  placeholder="e.g. Comp session for missed class, cash payment recorded in office"
                  className="min-h-20 bg-white"
                />
                <p className="text-xs text-slate-500">
                  {reason.trim().length}/10 characters minimum
                </p>
              </div>

              <label
                className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
              >
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(Boolean(v))}
                  className="mt-0.5"
                />
                <span>
                  I understand this will immediately change this client&apos;s
                  session balance and will be logged under my staff account.
                </span>
              </label>
            </div>

            <SheetFooter className="flex flex-row flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              {!canApply && !submitting ? (
                <p className="text-center text-xs text-slate-600 sm:text-left">
                  To apply: write a reason (10+ characters) and check the
                  confirmation box.
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="border-slate-300 bg-white"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-brand text-white hover:bg-brand/90 disabled:opacity-70"
              >
                {submitting ? "Saving…" : "Apply credit change"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
