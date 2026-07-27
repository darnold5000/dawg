import { passwordResetRedirectUrl } from "@/lib/signalworks/auth-recovery";
import { SITE } from "@/lib/constants";

/** Where Supabase sends staff after clicking the recovery link in email. */
export function adminPasswordResetRedirectUrl(): string {
  return passwordResetRedirectUrl({
    siteUrl: SITE.url,
    resetPath: "/admin/reset-password",
  });
}
