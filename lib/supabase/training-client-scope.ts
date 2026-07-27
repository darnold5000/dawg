import type { SupabaseClient } from "@supabase/supabase-js";
import { withTenantInsert, withTenantScope } from "@/lib/supabase/training-scope";

/** Merge deployment tenant into RPC args when not already supplied. */
export function tenantRpcArgs(
  tenantId: string,
  args?: Record<string, unknown>,
): Record<string, unknown> {
  const base = args ?? {};
  if (base.p_tenant_id != null) return base;
  return { p_tenant_id: tenantId, ...base };
}

export function wrapTableClient<T extends ReturnType<SupabaseClient["from"]>>(
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

export function wrapTrainingServiceClient(
  client: SupabaseClient,
  tenantId: string,
): SupabaseClient {
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
