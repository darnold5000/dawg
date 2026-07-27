import { adminPasswordResetRedirectUrl } from "@/lib/auth/admin-password-reset";
import { sendStaffPasswordResetEmail } from "@/lib/email";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { createTrainingServiceClient } from "@/lib/supabase/training-service";
import { getTrainingTenantIdOrNull } from "@/lib/tenant/deployment";

async function createStaffRecoveryLink(email: string): Promise<string> {
  const admin = createServiceClient();
  const redirectTo = adminPasswordResetRedirectUrl();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: email.trim().toLowerCase(),
    options: { redirectTo },
  });

  const actionLink = data?.properties?.action_link;
  if (error || !actionLink) {
    throw new Error(error?.message ?? "Could not create recovery link");
  }

  return actionLink;
}

async function staffDisplayNameForEmail(email: string): Promise<string> {
  const tenantId = getTrainingTenantIdOrNull();
  if (!tenantId || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "there";
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

  return "there";
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

  try {
    const actionLink = await createStaffRecoveryLink(emailNorm);
    const fullName = await staffDisplayNameForEmail(emailNorm);
    await sendStaffPasswordResetEmail({
      email: emailNorm,
      fullName,
      actionLink,
    });
  } catch (err) {
    console.error("[staff-forgot-password] delivery failed", err);
  }
}
