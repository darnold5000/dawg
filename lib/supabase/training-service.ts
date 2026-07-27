import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getTrainingTenantIdOrNull,
  requireTrainingTenantId,
} from "@/lib/tenant/deployment";
import { wrapTrainingServiceClient } from "@/lib/supabase/training-client-scope";

export type TrainingDb = {
  tenantId: string;
  client: SupabaseClient;
  from: (table: string) => ReturnType<SupabaseClient["from"]>;
};

/**
 * Service-role Supabase client. When TRAINING_TENANT_ID is set, scopes
 * queries/RPCs/inserts to that tenant (required on Signal Works Pro).
 */
export function createTrainingServiceClient(): SupabaseClient {
  const client = createServiceClient();
  const tenantId = getTrainingTenantIdOrNull();
  if (!tenantId) return client;
  return wrapTrainingServiceClient(client, tenantId);
}

/** Service-role access scoped to TRAINING_TENANT_ID (required). */
export function trainingDb(): TrainingDb {
  const tenantId = requireTrainingTenantId();
  const client = createTrainingServiceClient();
  return {
    tenantId,
    client,
    from(table: string) {
      return client.from(table);
    },
  };
}

/** When tenant env is unset, returns null (demo / local without Pro vertical). */
export function trainingDbOrNull(): TrainingDb | null {
  const tenantId = getTrainingTenantIdOrNull();
  if (!tenantId) return null;
  const client = createTrainingServiceClient();
  return {
    tenantId,
    client,
    from(table: string) {
      return client.from(table);
    },
  };
}
