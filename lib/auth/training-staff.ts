import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { createServiceClient } from "@/lib/supabase/server";
import { getTrainingTenantIdOrNull } from "@/lib/tenant/deployment";
import type { UserRole } from "@/lib/types/database";

export type TrainingStaffProfileRow = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const STAFF_SELECT =
  "full_name, email, phone, role, active, created_at, updated_at";

function parseStaffJson(value: unknown): TrainingStaffProfileRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.role !== "string") return null;
  return row as unknown as TrainingStaffProfileRow;
}

async function queryStaffRow(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string | null,
) {
  let query = supabase
    .from(DAWG_TABLES.profiles)
    .select(STAFF_SELECT)
    .eq("user_id", userId)
    .eq("active", true);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  return query.maybeSingle();
}

function createBearerAnonClient(accessToken: string): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

async function fetchStaffViaRpc(
  supabase: SupabaseClient,
  tenantId: string,
  userId?: string,
): Promise<TrainingStaffProfileRow | null> {
  if (userId) {
    const { data, error } = await supabase.rpc(
      "training_staff_profile_for_user",
      { p_tenant_id: tenantId, p_user_id: userId },
    );
    if (error) {
      console.error("[auth] training_staff_profile_for_user:", error.message);
      return null;
    }
    return parseStaffJson(data);
  }

  const { data, error } = await supabase.rpc(
    "training_staff_profile_for_current_user",
    { p_tenant_id: tenantId },
  );
  if (error) {
    console.error("[auth] training_staff_profile_for_current_user:", error.message);
    return null;
  }
  return parseStaffJson(data);
}

/**
 * Load staff profile by auth user id (server-only).
 * Uses security-definer RPCs when TRAINING_TENANT_ID is set (Pro), then table fallbacks.
 */
export async function fetchTrainingStaffProfileForUser(
  userId: string,
  options?: {
    accessToken?: string | null;
    userClient?: SupabaseClient | null;
  },
): Promise<TrainingStaffProfileRow | null> {
  const tenantId = getTrainingTenantIdOrNull();
  const attempts: string[] = [];

  if (tenantId) {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      const row = await fetchStaffViaRpc(
        createServiceClient(),
        tenantId,
        userId,
      );
      if (row) return row;
      attempts.push("rpc:service_role");
    }

    if (options?.accessToken) {
      const row = await fetchStaffViaRpc(
        createBearerAnonClient(options.accessToken),
        tenantId,
      );
      if (row) return row;
      attempts.push("rpc:bearer");
    }

    if (options?.userClient) {
      const row = await fetchStaffViaRpc(options.userClient, tenantId);
      if (row) return row;
      attempts.push("rpc:user_client");
    }
  }

  if (options?.accessToken) {
    const { data, error } = await queryStaffRow(
      createBearerAnonClient(options.accessToken),
      userId,
      tenantId,
    );
    if (data) return data as TrainingStaffProfileRow;
    if (error) attempts.push(`table:bearer:${error.message}`);
  }

  if (options?.userClient) {
    const { data, error } = await queryStaffRow(
      options.userClient,
      userId,
      tenantId,
    );
    if (data) return data as TrainingStaffProfileRow;
    if (error) attempts.push(`table:user_client:${error.message}`);
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    const { data, error } = await queryStaffRow(
      createServiceClient(),
      userId,
      tenantId,
    );
    if (data) return data as TrainingStaffProfileRow;
    if (error) attempts.push(`table:service_role:${error.message}`);
  } else {
    attempts.push("table:service_role:missing_key");
  }

  console.error(
    "[auth] training staff lookup missed",
    { userId, tenantId, attempts },
  );
  return null;
}
