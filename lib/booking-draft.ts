/**
 * Non-sensitive in-progress booking draft (sessionStorage).
 * Medical notes are kept only while the tab session is active and cleared on success.
 */

export type BookingDraft = {
  sessionId: string;
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteDob: string;
  primarySport: string;
  experienceLevel: string;
  /** Cleared on successful booking; not written to long-lived storage. */
  medicalNotes: string;
  customerNotes: string;
  paymentMethod: string;
  rememberFamily: boolean;
  mediaConsent: boolean;
  acceptRequiredAgreements: boolean;
  selectedAthleteId: string;
  editingDetails: boolean;
  updatedAt: string;
};

const draftKey = (sessionId: string) => `dawg_booking_draft:${sessionId}`;

export function loadBookingDraft(sessionId: string): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(draftKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookingDraft;
    if (parsed.sessionId !== sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveBookingDraft(draft: BookingDraft) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      draftKey(draft.sessionId),
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // quota / private mode — ignore
  }
}

export function clearBookingDraft(sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(draftKey(sessionId));
  } catch {
    // ignore
  }
}
