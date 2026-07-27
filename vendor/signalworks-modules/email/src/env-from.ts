import { formatFromAddress } from "./types";

export type ResendFromEnv = {
  RESEND_FROM_EMAIL?: string;
  fallbackFromEmail?: string;
};

const DEFAULT_FALLBACK = "bookings@signalworks.io";

/** Verified sender address from env (Resend requires domain verification). */
export function resolveResendFromEmail(env: ResendFromEnv): string {
  const from = env.RESEND_FROM_EMAIL?.trim();
  if (from) return from;
  return env.fallbackFromEmail?.trim() || DEFAULT_FALLBACK;
}

/** `Brand Name <hello@verified-domain.com>` */
export function formatBrandedFromAddress(
  displayName: string,
  fromEmail: string,
): string {
  return formatFromAddress({
    fromName: displayName.trim(),
    fromEmail: fromEmail.trim(),
  });
}
