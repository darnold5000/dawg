export type TenantEmailSettings = {
  tenantId: string;
  brandName: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  buttonColor: string | null;
  footerText: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
};

export type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  tags?: { name: string; value: string }[];
};

export type EmailDeliveryResult =
  | { ok: true; provider: string; messageId: string | null }
  | { ok: false; provider: string; message: string; statusCode?: number };

export function formatFromAddress(settings: Pick<
  TenantEmailSettings,
  "fromName" | "fromEmail"
>): string {
  const name = settings.fromName.trim();
  const email = settings.fromEmail.trim();
  if (!email) throw new Error("fromEmail is required");
  if (!name) return email;
  return `${name} <${email}>`;
}
