import {
  createTrainingServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { normalizeEmail } from "@/lib/parent-account";
import { getTrainingTenantIdOrNull } from "@/lib/tenant/deployment";

/** True when email belongs to an active staff profile (owner/admin/trainer). */
export async function isActiveStaffEmail(email: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }

  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const supabase = createTrainingServiceClient();
  const tenantId = getTrainingTenantIdOrNull();

  let query = supabase
    .from(DAWG_TABLES.profiles)
    .select("user_id")
    .ilike("email", normalized)
    .eq("active", true)
    .limit(1);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[staff-email] lookup failed:", error.message);
    return false;
  }

  return Array.isArray(data) ? data.length > 0 : Boolean(data);
}
