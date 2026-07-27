import { escapeHtml, firstName } from "./html";

export type PasswordResetEmailContent = {
  brandShortName: string;
  brandName: string;
  recipientFullName: string;
  actionLink: string;
  intro: string;
  footer: string;
  /** When true, uses staff-oriented heading styles. */
  staff?: boolean;
  /** Overrides default subject when set. */
  subject?: string;
};

export function buildPasswordResetEmail(
  input: PasswordResetEmailContent,
): { subject: string; html: string; text: string } {
  const name = firstName(input.recipientFullName);
  const subject =
    input.subject?.trim() ||
    `Reset your ${input.brandShortName.trim()} password`;
  const staffBadge = input.staff
    ? `<p style="font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #666;">${escapeHtml(input.brandShortName)} Staff</p>`
    : "";

  const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #121212;">
        ${staffBadge}
        <h1 style="font-size: 22px; margin: 16px 0 12px;">Reset your password</h1>
        <p>Hi ${escapeHtml(name)},</p>
        <p>${escapeHtml(input.intro)}</p>
        <p style="margin: 24px 0;">
          <a href="${input.actionLink}" style="display: inline-block; background: #121212; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Set new password
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">${escapeHtml(input.footer)}</p>
      </div>
    `;

  const text = `${subject}\n\nHi ${name},\n\n${input.intro}\n\n${input.actionLink}\n\n${input.footer}`;

  return { subject, html, text };
}
