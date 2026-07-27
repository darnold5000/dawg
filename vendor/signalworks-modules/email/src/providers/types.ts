import type { EmailDeliveryResult, SendEmailPayload } from "../types";

export type EmailProviderId = "resend";

export type EmailProvider = {
  readonly id: EmailProviderId;
  send(payload: SendEmailPayload & { from: string }): Promise<EmailDeliveryResult>;
};
