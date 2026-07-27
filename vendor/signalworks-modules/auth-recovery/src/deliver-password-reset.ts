export type DeliverPasswordResetRequestArgs = {
  emailNorm: string;
  redirectTo: string;
  createRecoveryLink: (input: {
    email: string;
    redirectTo: string;
  }) => Promise<{ actionLink: string }>;
  sendPasswordResetEmail: (input: {
    email: string;
    fullName: string;
    actionLink: string;
  }) => Promise<void>;
  resolveFullName?: (email: string) => Promise<string | undefined>;
  logTag?: string;
};

/**
 * Forgot-password delivery: never throws; does not reveal whether the email exists.
 */
export async function deliverPasswordResetRequest(
  args: DeliverPasswordResetRequestArgs,
): Promise<void> {
  const logTag = args.logTag ?? "password-reset";
  const email = args.emailNorm.trim().toLowerCase();

  try {
    const link = await args.createRecoveryLink({
      email,
      redirectTo: args.redirectTo,
    });
    const fullName =
      (await args.resolveFullName?.(email))?.trim() || "there";
    await args.sendPasswordResetEmail({
      email,
      fullName,
      actionLink: link.actionLink,
    });
  } catch (err) {
    console.error(`[${logTag}] delivery failed`, err);
  }
}
