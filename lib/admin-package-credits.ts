import { z } from "zod";
import { getPackageBySlug, listActivePackages } from "@/lib/packages";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import type {
  PackageCreditAdjustment,
  PackagePurchaseWithPackage,
} from "@/lib/types/database";

export const grantPackageCreditsSchema = z.object({
  action: z.literal("grant"),
  packageSlug: z.enum(["single", "pack-10", "pack-20"]),
  sessionCount: z.number().int().min(1).max(100).optional(),
  athleteId: z.string().uuid().optional().nullable(),
  reason: z.string().trim().min(10).max(500),
});

export const adjustExistingCreditsSchema = z.object({
  action: z.enum(["add", "remove"]),
  purchaseId: z.string().uuid(),
  amount: z.number().int().min(1).max(100),
  reason: z.string().trim().min(10).max(500),
});

export const packageCreditAdjustmentSchema = z.discriminatedUnion("action", [
  grantPackageCreditsSchema,
  adjustExistingCreditsSchema,
]);

export type PackageCreditAdjustmentInput = z.infer<
  typeof packageCreditAdjustmentSchema
>;

export async function listPackageCreditAdjustments(
  parentId: string,
): Promise<PackageCreditAdjustment[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(DAWG_TABLES.packageCreditAdjustments)
    .select(
      `
      *,
      staff:dawg_profiles ( full_name, email ),
      purchase:dawg_package_purchases (
        package:dawg_packages ( name )
      )
    `,
    )
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data as PackageCreditAdjustment[]) ?? [];
}

export async function applyPackageCreditAdjustment(input: {
  parentId: string;
  staffProfileId: string;
  body: PackageCreditAdjustmentInput;
}): Promise<
  | { ok: true; purchase: PackagePurchaseWithPackage }
  | { ok: false; error: string; code?: string }
> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Database unavailable", code: "NO_DB" };
  }

  const supabase = createServiceClient();

  if (input.body.action === "grant") {
    const pkg = await getPackageBySlug(input.body.packageSlug);
    if (!pkg) {
      return { ok: false, error: "Package not found", code: "NO_PACKAGE" };
    }

    const sessionCount = input.body.sessionCount ?? pkg.session_count;
    const { data: purchase, error } = await supabase
      .from(DAWG_TABLES.packagePurchases)
      .insert({
        parent_id: input.parentId,
        package_id: pkg.id,
        athlete_id: input.body.athleteId ?? null,
        status: "paid",
        sessions_total: sessionCount,
        sessions_remaining: sessionCount,
        amount_paid_cents: 0,
        currency: pkg.currency,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`*, package:dawg_packages (*)`)
      .single();

    if (error || !purchase) {
      return {
        ok: false,
        error: error?.message ?? "Could not grant credits",
        code: "GRANT_FAILED",
      };
    }

    await supabase.from(DAWG_TABLES.packageCreditAdjustments).insert({
      parent_id: input.parentId,
      purchase_id: purchase.id,
      staff_profile_id: input.staffProfileId,
      action: "grant",
      delta: sessionCount,
      sessions_before: 0,
      sessions_after: sessionCount,
      reason: input.body.reason,
    });

    return { ok: true, purchase: purchase as PackagePurchaseWithPackage };
  }

  const { data: current } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .select("*")
    .eq("id", input.body.purchaseId)
    .eq("parent_id", input.parentId)
    .maybeSingle();

  if (!current) {
    return { ok: false, error: "Purchase not found", code: "NOT_FOUND" };
  }

  const before = current.sessions_remaining;
  let after = before;
  let delta = input.body.amount;

  if (input.body.action === "add") {
    after = before + input.body.amount;
  } else {
    after = Math.max(0, before - input.body.amount);
    delta = -(before - after);
    if (delta === 0) {
      return {
        ok: false,
        error: "No sessions available to remove",
        code: "NO_CREDITS",
      };
    }
  }

  const updatePayload =
    input.body.action === "add"
      ? {
          sessions_remaining: after,
          sessions_total: current.sessions_total + input.body.amount,
          updated_at: new Date().toISOString(),
        }
      : {
          sessions_remaining: after,
          updated_at: new Date().toISOString(),
        };

  const { data: purchase, error } = await supabase
    .from(DAWG_TABLES.packagePurchases)
    .update(updatePayload)
    .eq("id", input.body.purchaseId)
    .select(`*, package:dawg_packages (*)`)
    .single();

  if (error || !purchase) {
    return {
      ok: false,
      error: error?.message ?? "Could not adjust credits",
      code: "ADJUST_FAILED",
    };
  }

  await supabase.from(DAWG_TABLES.packageCreditAdjustments).insert({
    parent_id: input.parentId,
    purchase_id: input.body.purchaseId,
    staff_profile_id: input.staffProfileId,
    action: input.body.action,
    delta,
    sessions_before: before,
    sessions_after: after,
    reason: input.body.reason,
  });

  return { ok: true, purchase: purchase as PackagePurchaseWithPackage };
}

export async function listGrantablePackages() {
  return listActivePackages();
}
