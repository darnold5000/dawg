import { z } from "zod";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
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
});

/** Guest checkout — parent contact only; credits assigned at attendance. */
export const publicPackageCheckoutSchema = z.object({
  packageSlug: z.enum(["single", "pack-10", "pack-20"]),
  parentFirstName: z.string().trim().min(1).max(80),
  parentLastName: z.string().trim().min(1).max(80),
  parentEmail: z.string().trim().email().max(160),
  parentPhone: z.string().trim().min(7).max(40),
});

export type PackageCheckoutInput = z.infer<typeof packageCheckoutSchema>;

export type LoggedInPackageCheckoutInput = z.infer<
  typeof loggedInPackageCheckoutSchema
>;

export async function listActivePackages(): Promise<TrainingPackage[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return FALLBACK_PACKAGES;
  }
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from(DAWG_TABLES.packages)
      .select("*")
      .eq("active", true)
      .order("display_order", { ascending: true });
    if (error || !data?.length) return FALLBACK_PACKAGES;
    return data as TrainingPackage[];
  } catch {
    return FALLBACK_PACKAGES;
  }
}

export async function getPackageBySlug(
  slug: string,
): Promise<TrainingPackage | null> {
  const packages = await listActivePackages();
  return packages.find((p) => p.slug === slug) ?? null;
}

export async function listActiveCreditsForParent(
  parentId: string,
  athleteId?: string | null,
): Promise<PackagePurchaseWithPackage[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .select(`*, package:dawg_packages (*)`)
    .eq("parent_id", parentId)
    .eq("status", "paid")
    .gt("sessions_remaining", 0)
    .order("paid_at", { ascending: true });

  const rows = (data as PackagePurchaseWithPackage[]) ?? [];
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
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .select("*")
    .eq("id", input.purchaseId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Purchase not found" };
  const current = existing as PackagePurchase;
  if (current.status === "paid") {
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
  return { ok: true, purchase: data as PackagePurchase };
}

export async function getPurchaseById(
  purchaseId: string,
): Promise<PackagePurchaseWithPackage | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .select(`*, package:dawg_packages (*)`)
    .eq("id", purchaseId)
    .maybeSingle();
  return (data as PackagePurchaseWithPackage) ?? null;
}

export async function getPurchaseByCheckoutSession(
  checkoutSessionId: string,
): Promise<PackagePurchaseWithPackage | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .select(`*, package:dawg_packages (*)`)
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle();
  return (data as PackagePurchaseWithPackage) ?? null;
}

export async function listPurchasesForParent(
  parentId: string,
): Promise<PackagePurchaseWithPackage[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .select(`*, package:dawg_packages (*)`)
    .eq("parent_id", parentId)
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

  const supabase = createServiceClient();

  const { data: booking } = await supabase
    .from(DAWG_TABLES.bookings)
    .select(
      "id, parent_id, athlete_id, attendance_status, payment_status, payment_method",
    )
    .eq("id", bookingId)
    .maybeSingle();

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
    "dawg_redeem_package_credit",
    {
      p_purchase_id: purchase.id,
      p_booking_id: bookingId,
      p_parent_id: booking.parent_id,
    },
  );

  if (error) {
    const message = error.message ?? "";
    if (message.includes("NO_CREDIT_AVAILABLE")) {
      return { ok: true, redeemed: false, reason: "no_credits" };
    }
    if (message.includes("unique") || message.includes("dawg_package_redemptions")) {
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

  const supabase = createServiceClient();
  const { data: bookings } = await supabase
    .from(DAWG_TABLES.bookings)
    .select("id")
    .eq("parent_id", parentId)
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
