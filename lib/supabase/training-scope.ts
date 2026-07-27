import {
  getTrainingTenantIdOrNull,
  requireTrainingTenantId,
} from "@/lib/tenant/deployment";

/**
 * Apply tenant_id filter for service-role queries (RLS bypassed).
 */
export function withTenantScope<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  tenantId?: string,
): T {
  const id = tenantId ?? requireTrainingTenantId();
  return query.eq("tenant_id", id);
}

export function requireTenantIdForServiceWrite(): string {
  return requireTrainingTenantId();
}

export function tenantIdForPublicRead(): string | null {
  return getTrainingTenantIdOrNull();
}

export function withTenantInsert<T extends Record<string, unknown>>(
  row: T,
  tenantId?: string,
): T & { tenant_id: string } {
  return {
    ...row,
    tenant_id: tenantId ?? requireTrainingTenantId(),
  };
}
