import type { EmailDeliveryResult, SendEmailPayload } from "../types";

import type { EmailProvider } from "./types";

export class ResendProvider implements EmailProvider {
  readonly id = "resend" as const;

  constructor(private readonly apiKey: string) {}

  async send(
    payload: SendEmailPayload & { from: string },
  ): Promise<EmailDeliveryResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: payload.from,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
          ...(payload.tags?.length ? { tags: payload.tags } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          provider: this.id,
          message: body || `Resend API error (${res.status})`,
          statusCode: res.status,
        };
      }

      const json = (await res.json().catch(() => ({}))) as { id?: string };
      return {
        ok: true,
        provider: this.id,
        messageId: json.id ?? null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Resend send failed";
      return { ok: false, provider: this.id, message };
    }
  }
}

export function createResendProvider(): ResendProvider | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new ResendProvider(apiKey);
}
