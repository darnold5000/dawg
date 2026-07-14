export type SavedAthlete = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  primarySport?: string;
  experienceLevel?: string;
  medicalNotes?: string;
};

export type SavedFamily = {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  athletes: SavedAthlete[];
  updatedAt: string;
};

const STORAGE_KEY = "dawg_returning_family";

export function loadSavedFamily(): SavedFamily | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedFamily;
    if (!parsed?.parentEmail || !Array.isArray(parsed.athletes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedFamily() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

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
  if (typeof window === "undefined") return;

  const existing = loadSavedFamily();
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
    medicalNotes: input.medicalNotes || undefined,
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
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(family));
}
