import { SITE } from "@/lib/constants";

/**
 * Bump when owner/attorney updates required booking agreements.
 * Returning devices that accepted this version skip re-checking until it changes.
 */
export const CURRENT_AGREEMENTS_VERSION = "2026-07-19-v2";

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
      "Reservations hold your athlete’s spot for the selected session. Payment is due according to the payment option shown for that session (online, package credit, and/or at the facility).",
      "A parent or legal guardian must complete bookings for minors and acknowledge facility policies during checkout.",
      `Please cancel or reschedule at least 24 hours in advance when possible by contacting DAWG at ${SITE.phone} or ${SITE.email}.`,
      "Session packages (single, 10-pack, 20-pack) may be purchased online; each booking can redeem one remaining session credit when available.",
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
      `Contact DAWG at ${SITE.phone} or ${SITE.email} to cancel or reschedule.`,
    ],
  };
}

export function privacyPolicyDoc(): PolicyDoc {
  return {
    id: "privacy",
    title: "Privacy policy",
    paragraphs: [
      `${SITE.name} collects parent and athlete information solely to manage training reservations, communicate about sessions, and operate the business. We do not sell personal information.`,
      "Intake and booking forms may collect names, email addresses, phone numbers, athlete dates of birth, school information, sports information, emergency contacts, and optional medical notes needed for safe training.",
      `Contact us at ${SITE.email} or ${SITE.phone} with privacy questions.`,
    ],
  };
}

/** Full liability waiver from DAWG Waiver and Release of Liability (owner-provided). */
export function waiverDoc(): PolicyDoc {
  return {
    id: "waiver",
    title: "Waiver and release of liability",
    paragraphs: [
      'IN CONSIDERATION OF the risk of injury that exists while participating in PERSONAL TRAINING (hereinafter the "Activity"); and',
      "IN CONSIDERATION OF my desire to participate in said Activity and being given the right to participate in same;",
      "I HEREBY, for myself, my heirs, executors, administrators, assigns, or personal representatives (hereinafter collectively, “Releasor,” “I” or “me”, which terms shall also include Releasor’s parents or guardian if Releasor is under 18 years of age), knowingly and voluntarily enter into this WAIVER AND RELEASE OF LIABILITY and hereby waive any and all rights, claims or causes of action of any kind arising out of my participation in the Activity; and",
      "I HEREBY release and forever discharge DAWG, located at 477 N Town Center Rd, Mooresville, Indiana 46158, their affiliates, managers, members, agents, attorneys, staff, volunteers, heirs, representatives, predecessors, successors and assigns (collectively “Releasees”), from any physical or psychological injury that I may suffer as a direct result of my participation in the aforementioned Activity.",
      "I AM VOLUNTARILY PARTICIPATING IN THE AFOREMENTIONED ACTIVITY AND I AM PARTICIPATING IN THE ACTIVITY ENTIRELY AT MY OWN RISK. I AM AWARE OF THE RISKS ASSOCIATED WITH PARTICIPATING IN THIS ACTIVITY, WHICH MAY INCLUDE, BUT ARE NOT LIMITED TO: PHYSICAL OR PSYCHOLOGICAL INJURY, PAIN, SUFFERING, ILLNESS, DISFIGUREMENT, TEMPORARY OR PERMANENT DISABILITY (INCLUDING PARALYSIS), ECONOMIC OR EMOTIONAL LOSS, AND DEATH. I UNDERSTAND THAT THESE INJURIES OR OUTCOMES MAY ARISE FROM MY OWN OR OTHERS’ NEGLIGENCE, CONDITIONS RELATED TO TRAVEL TO AND FROM THE ACTIVITY, OR FROM CONDITIONS AT THE ACTIVITY LOCATION(S). NONETHELESS, I ASSUME ALL RELATED RISKS, BOTH KNOWN AND UNKNOWN TO ME, OF MY PARTICIPATION IN THIS ACTIVITY.",
      "I FURTHER AGREE to indemnify, defend and hold harmless the Releasees against any and all claims, suits or actions of any kind whatsoever for liability, damages, compensation or otherwise brought by me or anyone on my behalf, including attorney’s fees and any related costs.",
      "I FURTHER ACKNOWLEDGE that Releasees are not responsible for errors, omissions, acts or failures to act of any party or entity conducting a specific event or activity on behalf of Releasees. In the event that I should require medical care or treatment, I authorize Dawg to provide all emergency medical care deemed necessary, including but not limited to, first aid, CPR, the use of AEDs, emergency medical transport, and sharing of medical information with medical personnel. I further agree to assume all costs involved and agree to be financially responsible for any costs incurred as a result of such treatment. I am aware and understand that I should carry my own health insurance.",
      "I FURTHER ACKNOWLEDGE that this Activity may involve a test of a person’s physical and mental limits and may carry with it the potential for death, serious injury, and property loss. I agree not to participate in the Activity unless I am medically able and properly trained, and I agree to abide by the decision of the Dawg official or agent, regarding my approval to participate in the Activity.",
      "I HEREBY ACKNOWLEDGE THAT I HAVE CAREFULLY READ THIS “WAIVER AND RELEASE” AND FULLY UNDERSTAND THAT IT IS A RELEASE OF LIABILITY. I EXPRESSLY AGREE TO RELEASE AND DISCHARGE Dawg AND ALL OF ITS AFFILIATES, MANAGERS, MEMBERS, AGENTS, ATTORNEYS, STAFF, VOLUNTEERS, HEIRS, REPRESENTATIVES, PREDECESSORS, SUCCESSORS AND ASSIGNS, FROM ANY AND ALL CLAIMS OR CAUSES OF ACTION AND I AGREE TO VOLUNTARILY GIVE UP OR WAIVE ANY RIGHT THAT I OTHERWISE HAVE TO BRING A LEGAL ACTION AGAINST Dawg FOR PERSONAL INJURY OR PROPERTY DAMAGE.",
      "To the extent that statute or case law does not prohibit releases for ordinary negligence, this release is also for such negligence on the part of Dawg, its agents, and employees.",
      "I agree that this Release shall be governed for all purposes by Indiana law, without regard to any conflict of law principles. This Release supersedes any and all previous oral or written promises or other agreements.",
      "In the event that any damage to equipment or facilities occurs as a result of my or my family’s or my agent’s willful actions, neglect or recklessness, I acknowledge and agree to be held liable for any and all costs associated with any such actions of neglect or recklessness.",
      "THIS WAIVER AND RELEASE OF LIABILITY SHALL REMAIN IN EFFECT FOR THE DURATION OF MY PARTICIPATION IN THE ACTIVITY, DURING THIS INITIAL AND ALL SUBSEQUENT EVENTS OF PARTICIPATION.",
      "THIS AGREEMENT was entered into at arm’s-length, without duress or coercion, and is to be interpreted as an agreement between two parties of equal bargaining strength. Both Participant and Dawg agree that this agreement is clear and unambiguous as to its terms, and that no other evidence shall be used or admitted to alter or explain the terms of this agreement, but that it will be interpreted based on the language in accordance with the purposes for which it is entered into.",
      "In the event that any provision contained within this Release of Liability shall be deemed to be severable or invalid, or if any term, condition, phrase or portion of this agreement shall be determined to be unlawful or otherwise unenforceable, the remainder of this agreement shall remain in full force and effect. If a court should find that any provision of this agreement to be invalid or unenforceable, but that by limiting said provision it would become valid and enforceable, then said provision shall be deemed to be written, construed and enforced as so limited.",
      "In the event of an emergency, please provide emergency contact information on the DAWG intake form. Online acceptance of this waiver constitutes your electronic acknowledgment equivalent to a signature for these purposes.",
      "I, THE UNDERSIGNED PARTICIPANT (OR PARENT/GUARDIAN), AFFIRM THAT I AM OF THE AGE OF 18 YEARS OR OLDER (OR AM THE PARENT/GUARDIAN OF A MINOR PARTICIPANT), AND THAT I AM FREELY ACCEPTING THIS AGREEMENT. I CERTIFY THAT I HAVE READ THIS AGREEMENT, THAT I FULLY UNDERSTAND ITS CONTENT AND THAT THIS RELEASE CANNOT BE MODIFIED ORALLY. I AM AWARE THAT THIS IS A RELEASE OF LIABILITY AND A CONTRACT AND THAT I AM ACCEPTING IT OF MY OWN FREE WILL.",
      "PARENT / GUARDIAN WAIVER FOR MINORS: In the event that the participant is under the age of consent (18 years of age), then this release must be accepted by a parent or guardian. By checking the required agreements box, I HEREBY CERTIFY that I am the parent or guardian of the named athlete, and I do hereby give my consent without reservation to the foregoing on behalf of this individual.",
    ],
  };
}

export function mediaConsentDoc(): PolicyDoc {
  return {
    id: "media",
    title: "Photo / media consent",
    paragraphs: [
      "Optional: DAWG may take photos or short video during training for coaching feedback, facility displays, or social media.",
      "You can decline media consent and still book a session or complete intake.",
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
