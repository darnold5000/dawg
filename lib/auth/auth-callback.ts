export {
  establishSessionFromAuthRedirect,
  type EstablishSessionOptions,
  type EstablishSessionResult,
} from "@/lib/signalworks/auth-recovery";

import type { AuthHashErrorMessages } from "@/lib/signalworks/auth-recovery";

/** DAWG-specific copy for recovery link errors. */
export const dawgAuthHashErrorMessages: AuthHashErrorMessages = {
  otpExpired:
    "This reset link has expired or was already used. Request a new one from Forgot password.",
  accessDenied: "This reset link is no longer valid.",
  generic: "This reset link is no longer valid.",
};

export const dawgInvalidRecoveryLinkMessage =
  "This reset link is invalid or has expired. Request a new one from Forgot password.";
