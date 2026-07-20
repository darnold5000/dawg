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
    description: "One training session — $25.",
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
    description: "10 sessions at $20 each — $200 total.",
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
    description: "20 sessions at $15 each — $300 total.",
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
