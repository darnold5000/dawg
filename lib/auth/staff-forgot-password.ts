import { createAuthLinkService, deliverPasswordResetRequest } from "@/lib/signalworks/auth-recovery";
import { adminPasswordResetRedirectUrl } from "@/lib/auth/admin-password-reset";
import { sendStaffPasswordResetEmail } from "@/lib/email";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { createTrainingServiceClient } from "@/lib/supabase/training-service";
import { getTrainingTenantIdOrNull } from "@/lib/tenant/deployment";

async function staffDisplayNameForEmail(email: string): Promise<string | undefined> {
  const tenantId = getTrainingTenantIdOrNull();
  if (!tenantId || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return undefined;
  }

  try {
    const supabase = createTrainingServiceClient();
    const { data } = await supabase
      .from(DAWG_TABLES.profiles)
      .select("full_name")
      .ilike("email", email.trim())
      .eq("active", true)
      .maybeSingle();

    if (data?.full_name?.trim()) {
      return data.full_name.trim();
    }
  } catch {
    // fall through
  }

  return undefined;
}

/**
 * Staff forgot-password delivery (Resend + generateLink).
 * Never throws to callers — logs failures. Does not reveal whether email exists.
 */
export async function deliverStaffPasswordResetRequest(
  emailNorm: string,
): Promise<void> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[staff-forgot-password] Supabase service role not configured");
    return;
  }

  const admin = createServiceClient();
  const links = createAuthLinkService(admin);
  const redirectTo = adminPasswordResetRedirectUrl();

  await deliverPasswordResetRequest({
    emailNorm,
    redirectTo,
    logTag: "staff-forgot-password",
    createRecoveryLink: (input) =>
      links.createRecoveryLink(input).then((r) => ({ actionLink: r.actionLink })),
    resolveFullName: staffDisplayNameForEmail,
    sendPasswordResetEmail: sendStaffPasswordResetEmail,
  });
}
