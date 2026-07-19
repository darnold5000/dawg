import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import { CURRENT_AGREEMENTS_VERSION } from "@/lib/agreements";

export const FAMILY_DEVICE_COOKIE = "dawg_family_device";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year

export type RememberedAthlete = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  primarySport?: string;
  experienceLevel?: string;
  /** Never included in remembered payloads — medical stays server-side only. */
};

export type RememberedFamily = {
  parentId: string;
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  athletes: RememberedAthlete[];
  agreementsVersion: string | null;
  agreementsAcceptedAt: string | null;
  agreementsCurrent: boolean;
  mediaConsentPreference: boolean;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("base64url");
}

export function familyDeviceCookieOptions(maxAge = COOKIE_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function readFamilyDeviceToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(FAMILY_DEVICE_COOKIE)?.value ?? null;
}

export async function setFamilyDeviceCookie(token: string) {
  const jar = await cookies();
  jar.set(FAMILY_DEVICE_COOKIE, token, familyDeviceCookieOptions());
}

export async function clearFamilyDeviceCookie() {
  const jar = await cookies();
  jar.set(FAMILY_DEVICE_COOKIE, "", familyDeviceCookieOptions(0));
}

export async function loadRememberedFamily(): Promise<RememberedFamily | null> {
  const token = await readFamilyDeviceToken();
  if (!token) return null;
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const supabase = createServiceClient();
  const tokenHash = hashToken(token);

  const { data: device } = await supabase
    .from(DAWG_TABLES.deviceFamilies)
    .select(
      "id, parent_id, accepted_agreements_version, accepted_agreements_at, media_consent_preference, revoked_at",
    )
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (!device) return null;

  const { data: parent } = await supabase
    .from(DAWG_TABLES.parents)
    .select("id, first_name, last_name, email, phone")
    .eq("id", device.parent_id)
    .maybeSingle();

  if (!parent) return null;

  const { data: athletes } = await supabase
    .from(DAWG_TABLES.athletes)
    .select(
      "id, first_name, last_name, date_of_birth, primary_sport, experience_level",
    )
    .eq("parent_id", parent.id)
    .order("first_name", { ascending: true });

  await supabase
    .from(DAWG_TABLES.deviceFamilies)
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", device.id);

  const version = device.accepted_agreements_version as string | null;

  return {
    parentId: parent.id,
    parentFirstName: parent.first_name,
    parentLastName: parent.last_name,
    parentEmail: parent.email,
    parentPhone: parent.phone,
    athletes: (athletes ?? []).map((a) => ({
      id: a.id,
      firstName: a.first_name,
      lastName: a.last_name,
      dob: a.date_of_birth,
      primarySport: a.primary_sport ?? undefined,
      experienceLevel: a.experience_level ?? undefined,
    })),
    agreementsVersion: version,
    agreementsAcceptedAt: device.accepted_agreements_at,
    agreementsCurrent: version === CURRENT_AGREEMENTS_VERSION,
    mediaConsentPreference: Boolean(device.media_consent_preference),
  };
}

export async function rememberFamilyOnDevice(input: {
  parentId: string;
  agreementsVersion: string;
  mediaConsent: boolean;
}): Promise<{ token: string } | { error: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Storage unavailable" };
  }

  const supabase = createServiceClient();
  const existingToken = await readFamilyDeviceToken();
  const now = new Date().toISOString();

  if (existingToken) {
    const existingHash = hashToken(existingToken);
    const { data: existing } = await supabase
      .from(DAWG_TABLES.deviceFamilies)
      .select("id, parent_id, revoked_at")
      .eq("token_hash", existingHash)
      .maybeSingle();

    if (existing && !existing.revoked_at && existing.parent_id === input.parentId) {
      await supabase
        .from(DAWG_TABLES.deviceFamilies)
        .update({
          accepted_agreements_version: input.agreementsVersion,
          accepted_agreements_at: now,
          media_consent_preference: input.mediaConsent,
          last_used_at: now,
        })
        .eq("id", existing.id);
      return { token: existingToken };
    }

    if (existing && !existing.revoked_at) {
      await supabase
        .from(DAWG_TABLES.deviceFamilies)
        .update({ revoked_at: now })
        .eq("id", existing.id);
    }
  }

  const token = newToken();
  const { error } = await supabase.from(DAWG_TABLES.deviceFamilies).insert({
    token_hash: hashToken(token),
    parent_id: input.parentId,
    accepted_agreements_version: input.agreementsVersion,
    accepted_agreements_at: now,
    media_consent_preference: input.mediaConsent,
    last_used_at: now,
  });

  if (error) {
    console.error("[family-device] remember", error);
    return { error: "Could not remember family on this device." };
  }

  return { token };
}

export async function forgetFamilyOnDevice() {
  const token = await readFamilyDeviceToken();
  if (
    token &&
    isSupabaseConfigured() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const supabase = createServiceClient();
    await supabase
      .from(DAWG_TABLES.deviceFamilies)
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashToken(token))
      .is("revoked_at", null);
  }
  await clearFamilyDeviceCookie();
}

/** Update agreements on an existing device token without creating a new one. */
export async function refreshDeviceAgreementsIfPresent(input: {
  parentId: string;
  agreementsVersion: string;
  mediaConsent: boolean;
}) {
  const token = await readFamilyDeviceToken();
  if (
    !token ||
    !isSupabaseConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return;
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  await supabase
    .from(DAWG_TABLES.deviceFamilies)
    .update({
      accepted_agreements_version: input.agreementsVersion,
      accepted_agreements_at: now,
      media_consent_preference: input.mediaConsent,
      last_used_at: now,
    })
    .eq("token_hash", hashToken(token))
    .eq("parent_id", input.parentId)
    .is("revoked_at", null);
}

export async function deviceAgreementsSatisfied(): Promise<boolean> {
  const family = await loadRememberedFamily();
  return Boolean(family?.agreementsCurrent);
}
