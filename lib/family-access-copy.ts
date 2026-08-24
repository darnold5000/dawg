export const FAMILY_CLAIM_COPY = {
  title: "Set up access to your existing DAWG family account",
  body: "Your family information is already on file. Set up access so you can view bookings, athletes, and package credits.",
  button: "Set up account access",
  emailHeading: "Set up access to your DAWG family account",
  emailButton: "Set up account access",
} as const;

export const FAMILY_LOGIN_COPY = {
  title: "Continue to DAWG",
  body: "Tap continue to pick up where you left off.",
  button: "Continue",
} as const;

export const FAMILY_INTAKE_COPY = {
  title: "Complete athlete intake",
  body: "Tap continue to open the intake form for your athlete.",
  button: "Continue to intake",
} as const;

/** Optional inline prompt on intake/booking when no device session is present. */
export const FAMILY_RESTORE_ACCESS_COPY = {
  prompt:
    "Already have a family profile on file? Email me a secure access link to prefill your information on this device.",
  linkLabel: "Get a secure access link",
} as const;
