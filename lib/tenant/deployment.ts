/**
 * Server-only deployment context for the training vertical on Signal Works Pro.
 * Do not import from Client Components.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TrainingDeploymentContext = {
  tenantId: string;
};

function readUuidEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  if (!UUID_RE.test(value)) {
    throw new Error(`${name} must be a valid UUID (got ${value})`);
  }
  return value;
}

/** True when Pro training vertical env is configured (preview / disposable). */
export function isTrainingDeploymentConfigured(): boolean {
  return Boolean(readUuidEnv("TRAINING_TENANT_ID"));
}

export function requireTrainingTenantId(): string {
  const id = readUuidEnv("TRAINING_TENANT_ID");
  if (!id) {
    throw new Error(
      "TRAINING_TENANT_ID is not configured. Required for the training vertical on Signal Works Pro.",
    );
  }
  return id;
}

export function requireTrainingDeploymentContext(): TrainingDeploymentContext {
  return { tenantId: requireTrainingTenantId() };
}

/** Optional tenant for read paths that support demo fallback when unset. */
export function getTrainingTenantIdOrNull(): string | null {
  return readUuidEnv("TRAINING_TENANT_ID") ?? null;
}
