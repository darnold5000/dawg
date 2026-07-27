import { z } from "zod";
import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  isTrainingDeploymentConfigured,
} from "@/lib/tenant/deployment";
import { PACKAGE_CATALOG_SEED_HINT } from "@/lib/package-catalog-hints";

export { PACKAGE_CATALOG_SEED_HINT } from "@/lib/package-catalog-hints";
import {
  withTenantInsert,
  withTenantScope,
} from "@/lib/supabase/training-scope";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import {
  mapBookingRow,
  mapPackagePurchaseRow,
  mapPackagePurchaseRows,
} from "@/lib/supabase/tenant-row-map";
import {
  findOrCreateParentByContact,
  normalizeEmail,
} from "@/lib/parent-account";
import type {
  PackagePurchase,
  PackagePurchaseWithPackage,
  TrainingPackage,
} from "@/lib/types/database";

const FALLBACK_PACKAGES: TrainingPackage[] = [
  {
    id: "pkg-single",
    slug: "single",
    name: "Single session",
    description: "One training session credit.",
    session_count: 1,
    price_cents: 2500,
    currency: "usd",
    active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "pkg-10",
    slug: "pack-10",
    name: "10 sessions",
    description: "Ten training session credits.",
    session_count: 10,
    price_cents: 20000,
    currency: "usd",
    active: true,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "pkg-20",
    slug: "pack-20",
    name: "20 sessions",
    description: "Twenty training session credits.",
    session_count: 20,
    price_cents: 30000,
    currency: "usd",
    active: true,
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Pro / tenant writes need service role + TRAINING_TENANT_ID — never hobby fallback IDs. */
function canQueryTrainingPackageCatalog(): boolean {
  return Boolean(
    isSupabaseConfigured() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      isTrainingDeploymentConfigured(),
  );
}

export const packagePaymentMethodSchema = z.enum([
  "stripe",
  "pay_at_facility",
]);

export const packageCheckoutSchema = z.object({
  packageSlug: z.enum(["single", "pack-10", "pack-20"]),
  parentFirstName: z.string().trim().min(1).max(80),
  parentLastName: z.string().trim().min(1).max(80),
  parentEmail: z.string().trim().email().max(160),
  parentPhone: z.string().trim().min(7).max(40),
  athleteFirstName: z.string().trim().min(1).max(80),
  athleteLastName: z.string().trim().min(1).max(80),
  athleteDob: z
    .string()
    .trim()
    .transform((v) => v.slice(0, 10))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth")),
  schoolGrade: z.string().trim().max(80).optional().default(""),
  heightWeight: z.string().trim().max(80).optional().default(""),
  sportPosition: z.string().trim().max(120).optional().default(""),
  healthIssues: z.string().trim().max(2000).optional().default(""),
  emergencyContact1Name: z.string().trim().min(1).max(120),
  emergencyContact1Phone: z.string().trim().min(7).max(40),
  emergencyContact2Name: z.string().trim().max(120).optional().default(""),
  emergencyContact2Phone: z.string().trim().max(40).optional().default(""),
  shirtSize: z
    .enum(["Small", "Medium", "Large", "XL", "XXL", "3XL"])
    .optional()
    .nullable(),
  goal: z.string().trim().max(2000).optional().default(""),
  acceptWaiver: z.literal(true, {
    error: "Please accept the liability waiver.",
  }),
  mediaConsent: z.boolean().default(false),
  rememberFamily: z.boolean().optional().default(true),
});

export const loggedInPackageCheckoutSchema = z.object({
  packageSlug: z.enum(["single", "pack-10", "pack-20"]),
  athleteId: z.string().uuid().optional().nullable(),
  paymentMethod: packagePaymentMethodSchema.optional().default("stripe"),
});

/** Guest checkout — parent contact only; credits assigned at attendance. */
export const publicPackageCheckoutSchema = z.object({
  packageSlug: z.enum(["single", "pack-10", "pack-20"]),
  parentFirstName: z.string().trim().min(1).max(80),
  parentLastName: z.string().trim().min(1).max(80),
  parentEmail: z.string().trim().email().max(160),
  parentPhone: z.string().trim().min(7).max(40),
  paymentMethod: packagePaymentMethodSchema.optional().default("stripe"),
});

export type PackageCheckoutInput = z.infer<typeof packageCheckoutSchema>;

export type LoggedInPackageCheckoutInput = z.infer<
  typeof loggedInPackageCheckoutSchema
>;

export async function listActivePackages(): Promise<TrainingPackage[]> {
  const loaded = await loadPackageCatalogForAdmin();
  return loaded.packages;
}

export type PackageCatalogLoadResult = {
  packages: TrainingPackage[];
  catalogWarning: string | null;
};

/** Admin / server: explains empty catalog (env vs seed). */
export async function loadPackageCatalogForAdmin(): Promise<PackageCatalogLoadResult> {
  if (!isSupabaseConfigured()) {
    return {
      packages: FALLBACK_PACKAGES,
      catalogWarning: null,
    };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      packages: [],
      catalogWarning:
        "Server cannot read packages: add SUPABASE_SERVICE_ROLE_KEY to this Vercel environment.",
    };
  }
  if (!isTrainingDeploymentConfigured()) {
    return {
      packages: [],
      catalogWarning:
        "Set TRAINING_TENANT_ID on Vercel to your dawg-youth-training tenant UUID (from migration 001 / tenants table).",
    };
  }
  try {
    const supabase = createTrainingServiceClient();
    const { data, error } = await withTenantScope(
      supabase
        .from(DAWG_TABLES.packages)
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true }),
    );
    if (error) {
      console.error("[packages] loadPackageCatalogForAdmin", error);
      return {
        packages: [],
        catalogWarning: `Could not load packages: ${error.message}`,
      };
    }
    const packages = (data as TrainingPackage[]) ?? [];
    if (packages.length === 0) {
      return {
        packages: [],
        catalogWarning: PACKAGE_CATALOG_SEED_HINT,
      };
    }
    return { packages, catalogWarning: null };
  } catch (err) {
    console.error("[packages] loadPackageCatalogForAdmin", err);
    return {
      packages: [],
      catalogWarning:
        err instanceof Error ? err.message : "Could not load package catalog",
    };
  }
}

export async function getPackageBySlug(
  slug: string,
): Promise<TrainingPackage | null> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_PACKAGES.find((p) => p.slug === slug) ?? null;
  }
  if (!canQueryTrainingPackageCatalog()) {
    return null;
  }
  try {
    const supabase = createTrainingServiceClient();
    const { data, error } = await withTenantScope(
      supabase.from(DAWG_TABLES.packages).select("*").eq("slug", slug),
    ).maybeSingle();
    if (error) {
      console.error("[packages] getPackageBySlug", error);
      return null;
    }
    if (!data) return null;
    const pkg = data as TrainingPackage;
    if (!isUuid(pkg.id)) {
      console.error("[packages] package row has invalid id for slug", slug);
      return null;
    }
    return pkg.active ? pkg : null;
  } catch (err) {
    console.error("[packages] getPackageBySlug", err);
    return null;
  }
}

/** Pay at facility — order on file; credits activate when staff confirms payment. */
export async function createPackagePayAtFacilityPurchase(input: {
  packageSlug: "single" | "pack-10" | "pack-20";
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  parentId?: string;
  athleteId?: string | null;
}): Promise<
  { ok: true; purchaseId: string } | { ok: false; error: string; code?: string }
> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Checkout unavailable", code: "UNAVAILABLE" };
  }

  const pkg = await getPackageBySlug(input.packageSlug);
  if (!pkg) {
    return {
      ok: false,
      error:
        "Package not found in the catalog. " + PACKAGE_CATALOG_SEED_HINT,
      code: "PACKAGE_NOT_FOUND",
    };
  }

  const supabase = createTrainingServiceClient();
  let parentId = input.parentId ?? null;

  if (!parentId) {
    const parentResult = await findOrCreateParentByContact({
      email: normalizeEmail(input.parentEmail),
      firstName: input.parentFirstName,
      lastName: input.parentLastName,
      phone: input.parentPhone,
    });
    if (!parentResult.ok) {
      return {
        ok: false,
        error: parentResult.error,
        code: parentResult.code,
      };
    }
    parentId = parentResult.parent.id;
  } else {
    await supabase
      .from(DAWG_TABLES.parents)
      .update({
        first_name: input.parentFirstName,
        last_name: input.parentLastName,
        phone: input.parentPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parentId);
  }

  const { data: purchase, error } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .insert(
      withTenantInsert({
        guardian_id: parentId,
        package_id: pkg.id,
        athlete_id: input.athleteId ?? null,
        status: "pending",
        sessions_total: pkg.session_count,
        sessions_remaining: 0,
        amount_paid_cents: 0,
        currency: pkg.currency,
      }),
    )
    .select("id")
    .single();

  if (error || !purchase) {
    return {
      ok: false,
      error: error?.message ?? "Could not save package order",
      code: "PURCHASE_FAILED",
    };
  }

  return { ok: true, purchaseId: purchase.id };
}

export async function listActiveCreditsForParent(
  parentId: string,
  athleteId?: string | null,
): Promise<PackagePurchaseWithPackage[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }
  const supabase = createTrainingServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .select(`*, package:training_packages (*)`)
    .eq("guardian_id", parentId)
    .eq("status", "paid")
    .gt("sessions_remaining", 0)
    .order("paid_at", { ascending: true });

  const rows = mapPackagePurchaseRows(
    (data ?? []) as Record<string, unknown>[],
  ) as PackagePurchaseWithPackage[];
  if (!athleteId) return rows;

  const preferred = rows.filter(
    (r) => r.athlete_id === athleteId || r.athlete_id == null,
  );
  preferred.sort((a, b) => {
    if (a.athlete_id === athleteId && b.athlete_id !== athleteId) return -1;
    if (b.athlete_id === athleteId && a.athlete_id !== athleteId) return 1;
    return 0;
  });
  return preferred.length ? preferred : rows;
}

export async function totalCreditsRemaining(
  parentId: string,
  athleteId?: string | null,
): Promise<number> {
  const credits = await listActiveCreditsForParent(parentId, athleteId);
  return credits.reduce((sum, c) => sum + c.sessions_remaining, 0);
}

export async function confirmPackagePurchasePaid(input: {
  purchaseId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  stripeCustomerId: string | null;
  amountPaidCents: number;
}): Promise<{ ok: true; purchase: PackagePurchase } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable" };
  }
  const supabase = createTrainingServiceClient();
  const { data: existing } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .select("*")
    .eq("id", input.purchaseId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Purchase not found" };
  const current = mapPackagePurchaseRow(existing as Record<string, unknown>);
  if (current.status === "paid") {
    if (
      current.sessions_total > 0 &&
      current.sessions_remaining < current.sessions_total
    ) {
      const { data: repaired, error: repairError } = await supabase
        .from(DAWG_TABLES.packagePurchases)
        .update({
          sessions_remaining: current.sessions_total,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.purchaseId)
        .select("*")
        .single();
      if (!repairError && repaired) {
        return {
          ok: true,
          purchase: mapPackagePurchaseRow(repaired as Record<string, unknown>),
        };
      }
    }
    return { ok: true, purchase: current };
  }

  const { data, error } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .update({
      status: "paid",
      sessions_remaining: current.sessions_total,
      amount_paid_cents: input.amountPaidCents,
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      stripe_payment_intent_id: input.stripePaymentIntentId,
      stripe_customer_id: input.stripeCustomerId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.purchaseId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not confirm purchase" };
  }
  return { ok: true, purchase: mapPackagePurchaseRow(data as Record<string, unknown>) };
}

export async function getPurchaseById(
  purchaseId: string,
): Promise<PackagePurchaseWithPackage | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createTrainingServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .select(`*, package:training_packages (*)`)
    .eq("id", purchaseId)
    .maybeSingle();
  return data
    ? (mapPackagePurchaseRow(data as Record<string, unknown>) as PackagePurchaseWithPackage)
    : null;
}

export async function getPurchaseByCheckoutSession(
  checkoutSessionId: string,
): Promise<PackagePurchaseWithPackage | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createTrainingServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .select(`*, package:training_packages (*)`)
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle();
  return data
    ? (mapPackagePurchaseRow(data as Record<string, unknown>) as PackagePurchaseWithPackage)
    : null;
}

export async function listPurchasesForParent(
  parentId: string,
): Promise<PackagePurchaseWithPackage[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }
  const supabase = createTrainingServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .select(`*, package:training_packages (*)`)
    .eq("guardian_id", parentId)
    .order("created_at", { ascending: false });
  return (data as PackagePurchaseWithPackage[]) ?? [];
}

export type PackageCreditRedemptionResult =
  | {
      ok: true;
      redeemed: true;
      purchaseId: string;
      sessionsRemaining: number;
      packageName: string | null;
    }
  | {
      ok: true;
      redeemed: false;
      reason:
        | "already_redeemed"
        | "paid_online"
        | "paid_at_facility"
        | "no_credits"
        | "not_attended";
    }
  | { ok: false; error: string; code?: string };

/**
 * Deduct one package credit when staff marks attendance as attended.
 * Idempotent per booking — credits are not double-charged.
 */
export async function redeemPackageCreditOnAttendance(
  bookingId: string,
): Promise<PackageCreditRedemptionResult> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable", code: "NO_DB" };
  }

  const supabase = createTrainingServiceClient();

  const { data: bookingRow } = await supabase
    .from(DAWG_TABLES.bookings)
    .select(
      "id, parent_id:guardian_id, athlete_id, attendance_status, payment_status, payment_method",
    )
    .eq("id", bookingId)
    .maybeSingle();

  const booking = mapBookingRow(
    (bookingRow ?? null) as Record<string, unknown> | null,
  );
  if (!booking) {
    return { ok: false, error: "Booking not found", code: "NOT_FOUND" };
  }

  if (booking.attendance_status !== "attended") {
    return { ok: true, redeemed: false, reason: "not_attended" };
  }

  const { data: existingRedemption } = await supabase
    .from(DAWG_TABLES.packageRedemptions)
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existingRedemption) {
    return { ok: true, redeemed: false, reason: "already_redeemed" };
  }

  // Roster / package sessions use not_required at booking — credit is taken at attendance.
  if (
    booking.payment_method === "stripe" &&
    (booking.payment_status === "paid" || booking.payment_status === "pending")
  ) {
    return { ok: true, redeemed: false, reason: "paid_online" };
  }

  if (
    booking.payment_method === "pay_at_facility" &&
    booking.payment_status === "paid"
  ) {
    return { ok: true, redeemed: false, reason: "paid_at_facility" };
  }

  if (booking.payment_method === "package_credit") {
    return { ok: true, redeemed: false, reason: "already_redeemed" };
  }

  const credits = await listActiveCreditsForParent(
    booking.parent_id,
    booking.athlete_id,
  );
  const purchase = credits[0];
  if (!purchase) {
    return { ok: true, redeemed: false, reason: "no_credits" };
  }

  const { data: remaining, error } = await supabase.rpc(
    "training_redeem_package_credit",
    {
      p_purchase_id: purchase.id,
      p_booking_id: bookingId,
      p_guardian_id: booking.parent_id,
    },
  );

  if (error) {
    const message = error.message ?? "";
    if (message.includes("NO_CREDIT_AVAILABLE")) {
      return { ok: true, redeemed: false, reason: "no_credits" };
    }
    if (message.includes("unique") || message.includes("training_package_redemptions")) {
      return { ok: true, redeemed: false, reason: "already_redeemed" };
    }
    return { ok: false, error: message, code: "REDEEM_FAILED" };
  }

  await supabase
    .from(DAWG_TABLES.bookings)
    .update({
      payment_method: "package_credit",
      payment_status: "paid",
      amount_paid_cents: purchase.amount_paid_cents
        ? Math.round(purchase.amount_paid_cents / purchase.sessions_total)
        : 0,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  return {
    ok: true,
    redeemed: true,
    purchaseId: purchase.id,
    sessionsRemaining: Number(remaining),
    packageName: purchase.package?.name ?? null,
  };
}

/** Backfill credits for attended bookings that never had a redemption recorded. */
export async function syncAttendedBookingCredits(parentId: string): Promise<{
  ok: true;
  redeemed: number;
  skipped: number;
  failed: number;
}> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, redeemed: 0, skipped: 0, failed: 0 };
  }

  const supabase = createTrainingServiceClient();
  const { data: bookings } = await supabase
    .from(DAWG_TABLES.bookings)
    .select("id")
    .eq("guardian_id", parentId)
    .eq("attendance_status", "attended")
    .order("booked_at", { ascending: true });

  let redeemed = 0;
  let skipped = 0;
  let failed = 0;

  for (const booking of bookings ?? []) {
    const result = await redeemPackageCreditOnAttendance(booking.id);
    if (!result.ok) {
      failed += 1;
    } else if (result.redeemed) {
      redeemed += 1;
    } else {
      skipped += 1;
    }
  }

  return { ok: true, redeemed, skipped, failed };
}
