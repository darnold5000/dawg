import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { withTenantInsert, withTenantScope } from "@/lib/supabase/training-scope";
import {
  getTrainingTenantIdOrNull,
  requireTrainingTenantId,
} from "@/lib/tenant/deployment";

export type TrainingDb = {
  tenantId: string;
  client: SupabaseClient;
  from: (table: string) => ReturnType<SupabaseClient["from"]>;
};

function tenantRpcArgs(
  tenantId: string,
  args?: Record<string, unknown>,
): Record<string, unknown> {
  const base = args ?? {};
  if (base.p_tenant_id != null) return base;
  return { p_tenant_id: tenantId, ...base };
}

function wrapTableClient<T extends ReturnType<SupabaseClient["from"]>>(
  table: T,
  tenantId: string,
): T {
  return new Proxy(table, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;

      if (prop === "insert" || prop === "upsert") {
        return (payload: unknown, ...rest: unknown[]) => {
          const withTenant = (row: Record<string, unknown>) =>
            withTenantInsert(row, tenantId);
          const next = Array.isArray(payload)
            ? payload.map((row) => withTenant(row as Record<string, unknown>))
            : withTenant(payload as Record<string, unknown>);
          return value.call(target, next, ...rest);
        };
      }

      if (prop === "select" || prop === "update" || prop === "delete") {
        return (...args: unknown[]) =>
          withTenantScope(Reflect.apply(value, target, args), tenantId);
      }

      return value.bind(target);
    },
  }) as T;
}

/**
 * Service-role Supabase client. When TRAINING_TENANT_ID is set, scopes
 * queries/RPCs/inserts to that tenant (required on Signal Works Pro).
 */
export function createTrainingServiceClient(): SupabaseClient {
  const client = createServiceClient();
  const tenantId = getTrainingTenantIdOrNull();
  if (!tenantId) return client;

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (table: string) =>
          wrapTableClient(target.from(table), tenantId);
      }
      if (prop === "rpc") {
        return (fn: string, args?: Record<string, unknown>) =>
          target.rpc(fn, tenantRpcArgs(tenantId, args));
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as SupabaseClient;
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
