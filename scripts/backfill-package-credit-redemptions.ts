#!/usr/bin/env npx tsx
/**
 * One-time backfill: redeem package credits for attended bookings in a snapshot file.
 *
 * Prerequisites (.env.local with prod Supabase + TRAINING_TENANT_ID):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   TRAINING_TENANT_ID=6bd000db-c17e-4ca9-98ee-030f57aa523a
 *
 * Dry run (default):
 *   npm run db:backfill-package-credits
 *
 * Apply:
 *   APPLY=1 npm run db:backfill-package-credits
 *
 * Custom snapshot:
 *   BACKFILL_SNAPSHOT=docs/ops/credit-backfill-bookings-snapshot-2026-10-28.json APPLY=1 npm run ...
 */
import "./load-env-local";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { redeemPackageCreditOnAttendance } from "../lib/packages";
import { requireTrainingTenantId } from "../lib/tenant/deployment";

const BRITTANY_BOOKING_ID = "cb41474b-dbcc-4e3c-89a5-ca6f9a2503e2";

type SnapshotRow = {
  booking_id: string;
  email: string;
  last_name: string;
  session_date: string;
  backfillRecommended?: boolean;
};

type SnapshotFile = {
  tenantId?: string;
  bookings: SnapshotRow[];
};

async function main() {
  const apply = process.env.APPLY === "1" || process.env.APPLY === "true";
  const snapshotPath = resolve(
    process.cwd(),
    process.env.BACKFILL_SNAPSHOT ??
      "docs/ops/credit-backfill-bookings-snapshot-2026-10-28.json",
  );

  const snapshot = JSON.parse(
    readFileSync(snapshotPath, "utf8"),
  ) as SnapshotFile;

  const tenantId = requireTrainingTenantId();
  if (snapshot.tenantId && snapshot.tenantId !== tenantId) {
    console.error(
      `TRAINING_TENANT_ID (${tenantId}) does not match snapshot (${snapshot.tenantId}).`,
    );
    process.exit(1);
  }

  const rows = snapshot.bookings.filter(
    (row) =>
      row.booking_id !== BRITTANY_BOOKING_ID &&
      row.backfillRecommended !== false,
  );

  console.log(
    apply ? "APPLY — redeeming credits" : "DRY RUN — no database writes",
  );
  console.log(`Snapshot: ${snapshotPath}`);
  console.log(`Bookings: ${rows.length} (Brittany excluded)\n`);

  let redeemed = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const label = `${row.last_name} ${row.session_date} ${row.booking_id.slice(0, 8)}…`;
    if (!apply) {
      console.log(`  would redeem  ${label}`);
      continue;
    }

    const result = await redeemPackageCreditOnAttendance(row.booking_id);
    if (!result.ok) {
      failed += 1;
      console.log(`  FAILED      ${label} — ${result.error}`);
      continue;
    }
    if (result.redeemed) {
      redeemed += 1;
      console.log(
        `  redeemed    ${label} — ${result.packageName ?? "pack"} (${result.sessionsRemaining} left)`,
      );
    } else {
      skipped += 1;
      console.log(`  skipped     ${label} — ${result.reason}`);
    }
  }

  if (apply) {
    console.log(`\nDone: ${redeemed} redeemed, ${skipped} skipped, ${failed} failed`);
    console.log("Re-run the audit SQL in Supabase; expect 0 rows (except maybe Brittany).");
  } else {
    console.log(`\nTo apply: APPLY=1 npm run db:backfill-package-credits`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
