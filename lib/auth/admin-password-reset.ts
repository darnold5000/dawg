import { SITE } from "@/lib/constants";

/** Where Supabase sends staff after clicking the recovery link in email. */
export function adminPasswordResetRedirectUrl(): string {
  return `${SITE.url.replace(/\/$/, "")}/admin/reset-password`;
}
