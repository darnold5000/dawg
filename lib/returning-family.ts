/**
 * Client helpers for returning-family UX.
 * Secure remember uses an httpOnly cookie + dawg_device_families (server).
 * Legacy plaintext localStorage is cleared on load and never stores medical notes.
 */

/** Client-safe shapes (do not import server cookie helpers here). */
export type SavedAthlete = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  primarySport?: string;
  experienceLevel?: string;
};

export type SavedFamily = {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  athletes: SavedAthlete[];
  agreementsCurrent?: boolean;
  mediaConsentPreference?: boolean;
};

type RememberedFamilyPayload = SavedFamily & {
  parentId: string;
  agreementsVersion: string | null;
  agreementsAcceptedAt: string | null;
  agreementsCurrent: boolean;
  mediaConsentPreference: boolean;
};

const LEGACY_KEY = "dawg_returning_family";
const DEMO_KEY = "dawg_family_device_demo";

/** Wipe insecure legacy payload (may have included medical notes). */
export function clearLegacyLocalFamily() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore
  }
}

/**
 * One-time migrate: if old localStorage family exists, return a safe copy
 * (no medical) for prefill, then delete the legacy key.
 */
export function consumeLegacyLocalFamily(): SavedFamily | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      parentFirstName?: string;
      parentLastName?: string;
      parentEmail?: string;
      parentPhone?: string;
      athletes?: Array<{
        id: string;
        firstName: string;
        lastName: string;
        dob: string;
        primarySport?: string;
        experienceLevel?: string;
      }>;
    };
    window.localStorage.removeItem(LEGACY_KEY);
    if (!parsed?.parentEmail || !Array.isArray(parsed.athletes)) return null;
    return {
      parentFirstName: parsed.parentFirstName ?? "",
      parentLastName: parsed.parentLastName ?? "",
      parentEmail: parsed.parentEmail,
      parentPhone: parsed.parentPhone ?? "",
      athletes: parsed.athletes.map((a) => ({
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        dob: a.dob,
        primarySport: a.primarySport,
        experienceLevel: a.experienceLevel,
      })),
      agreementsCurrent: false,
    };
  } catch {
    try {
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

/** Demo / offline fallback when Supabase is not configured — no medical notes. */
export function loadDemoSavedFamily(): SavedFamily | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedFamily;
    if (!parsed?.parentEmail || !Array.isArray(parsed.athletes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDemoSavedFamily() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DEMO_KEY);
  } catch {
    // ignore
  }
}

export function saveDemoFamily(input: {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteDob: string;
  primarySport?: string;
  experienceLevel?: string;
}) {
  if (typeof window === "undefined") return;

  const existing = loadDemoSavedFamily();
  const sameParent =
    existing &&
    existing.parentEmail.toLowerCase() === input.parentEmail.toLowerCase();

  const athleteId = [
    input.athleteFirstName,
    input.athleteLastName,
    input.athleteDob,
  ]
    .join("-")
    .toLowerCase()
    .replace(/\s+/g, "-");

  const nextAthlete: SavedAthlete = {
    id: athleteId,
    firstName: input.athleteFirstName,
    lastName: input.athleteLastName,
    dob: input.athleteDob,
    primarySport: input.primarySport || undefined,
    experienceLevel: input.experienceLevel || undefined,
  };

  const athletes = sameParent ? [...existing.athletes] : [];
  const idx = athletes.findIndex((a) => a.id === athleteId);
  if (idx >= 0) athletes[idx] = nextAthlete;
  else athletes.push(nextAthlete);

  const family: SavedFamily = {
    parentFirstName: input.parentFirstName,
    parentLastName: input.parentLastName,
    parentEmail: input.parentEmail,
    parentPhone: input.parentPhone,
    athletes,
    agreementsCurrent: true,
  };

  window.localStorage.setItem(DEMO_KEY, JSON.stringify(family));
}

export function rememberedToSaved(family: RememberedFamilyPayload): SavedFamily {
  return {
    parentFirstName: family.parentFirstName,
    parentLastName: family.parentLastName,
    parentEmail: family.parentEmail,
    parentPhone: family.parentPhone,
    athletes: family.athletes,
    agreementsCurrent: family.agreementsCurrent,
    mediaConsentPreference: family.mediaConsentPreference,
  };
}

export async function fetchRememberedFamily(): Promise<SavedFamily | null> {
  clearLegacyLocalFamily();
  try {
    const res = await fetch("/api/family/remembered", {
      credentials: "same-origin",
    });
    if (!res.ok) return loadDemoSavedFamily() ?? consumeLegacyLocalFamily();
    const data = (await res.json()) as {
      family: RememberedFamilyPayload | null;
    };
    if (data.family) return rememberedToSaved(data.family);
    return loadDemoSavedFamily() ?? consumeLegacyLocalFamily();
  } catch {
    return loadDemoSavedFamily() ?? consumeLegacyLocalFamily();
  }
}

export async function forgetRememberedFamily() {
  clearDemoSavedFamily();
  clearLegacyLocalFamily();
  try {
    await fetch("/api/family/remembered", {
      method: "DELETE",
      credentials: "same-origin",
    });
  } catch {
    // ignore
  }
}

/** @deprecated Use fetchRememberedFamily — kept for any stray imports. */
export function loadSavedFamily(): SavedFamily | null {
  return loadDemoSavedFamily();
}

/** @deprecated */
export function clearSavedFamily() {
  clearDemoSavedFamily();
  clearLegacyLocalFamily();
}

/** @deprecated — medical notes intentionally omitted */
export function saveFamilyFromBooking(input: {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteDob: string;
  primarySport?: string;
  experienceLevel?: string;
  medicalNotes?: string;
}) {
  saveDemoFamily(input);
}
