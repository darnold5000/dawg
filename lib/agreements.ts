import { SITE } from "@/lib/constants";

/**
 * Bump when owner/attorney updates required booking agreements.
 * Returning devices that accepted this version skip re-checking until it changes.
 */
export const CURRENT_AGREEMENTS_VERSION = "2026-07-19";

export type PolicyDocId =
  | "booking"
  | "cancellation"
  | "privacy"
  | "waiver"
  | "media";

export type PolicyDoc = {
  id: PolicyDocId;
  title: string;
  /** Placeholder-aware body paragraphs. */
  paragraphs: string[];
};

export function bookingPolicyDoc(): PolicyDoc {
  return {
    id: "booking",
    title: "Booking policy",
    paragraphs: [
      "Reservations hold your athlete’s spot for the selected session. Payment is due according to the payment option shown for that session (online and/or at the facility).",
      "A parent or legal guardian must complete bookings for minors and acknowledge facility policies during checkout.",
      `Please cancel or reschedule at least 24 hours in advance when possible by contacting DAWGZ at ${SITE.phone} or ${SITE.email}.`,
      "Final booking-policy wording should be reviewed and approved by DAWGZ before launch.",
    ],
  };
}

export function cancellationPolicyDoc(sessionText?: string | null): PolicyDoc {
  return {
    id: "cancellation",
    title: "Cancellation policy",
    paragraphs: [
      sessionText?.trim() ||
        "Please cancel at least 24 hours in advance when possible so another athlete can take the spot.",
      `Contact DAWGZ at ${SITE.phone} or ${SITE.email} to cancel or reschedule.`,
      "Owner-approved cancellation terms should replace this placeholder before launch.",
    ],
  };
}

export function privacyPolicyDoc(): PolicyDoc {
  return {
    id: "privacy",
    title: "Privacy policy",
    paragraphs: [
      `${SITE.name} collects parent and athlete information solely to manage training reservations, communicate about sessions, and operate the business. We do not sell personal information.`,
      "Booking forms may collect names, email addresses, phone numbers, athlete dates of birth, sports information, and optional medical notes needed for safe training.",
      `Contact us at ${SITE.email} or ${SITE.phone} with privacy questions. This page is a starting draft and should be reviewed by DAWGZ before launch.`,
    ],
  };
}

export function waiverDoc(): PolicyDoc {
  return {
    id: "waiver",
    title: "Liability waiver",
    paragraphs: [
      "Liability waiver language will be provided and approved by DAWGZ (and counsel as needed) before online checkboxes are treated as a complete legal waiver.",
      "By continuing, you acknowledge that athletic training involves inherent risks and that final waiver terms will apply once published by DAWGZ.",
      "This is a preliminary acknowledgment only — not final attorney-approved waiver text.",
    ],
  };
}

export function mediaConsentDoc(): PolicyDoc {
  return {
    id: "media",
    title: "Photo / media consent",
    paragraphs: [
      "Optional: DAWGZ may take photos or short video during training for coaching feedback, facility displays, or social media.",
      "You can decline media consent and still book a session. Final media-release wording should be approved by DAWGZ before launch.",
    ],
  };
}

export function getPolicyDoc(
  id: PolicyDocId,
  cancellationText?: string | null,
): PolicyDoc {
  switch (id) {
    case "booking":
      return bookingPolicyDoc();
    case "cancellation":
      return cancellationPolicyDoc(cancellationText);
    case "privacy":
      return privacyPolicyDoc();
    case "waiver":
      return waiverDoc();
    case "media":
      return mediaConsentDoc();
  }
}
