import { createHash, randomBytes } from "crypto";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { DAWG_TABLES } from "@/lib/supabase/tables";
import {
  rememberFamilyOnDevice,
  setFamilyDeviceCookie,
} from "@/lib/family-device";
import { CURRENT_AGREEMENTS_VERSION } from "@/lib/agreements";
import { sendFamilyLoginEmail } from "@/lib/email";
import { setAuthReturnCookie } from "@/lib/family-auth";
import { evaluateLoginToken } from "@/lib/family-token-verify";

const TOKEN_TTL_MINUTES = 30;

export type FamilyTokenPurpose = "login" | "claim";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("base64url");
}

export async function createFamilyAccessToken(input: {
  parentId: string;
  email: string;
  purpose?: FamilyTokenPurpose;
}): Promise<string | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const token = newToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString();
  const supabase = createServiceClient();

  const { error } = await supabase.from(DAWG_TABLES.familyLoginTokens).insert({
    parent_id: input.parentId,
    token_hash: hashToken(token),
    email: input.email,
    expires_at: expiresAt,
    purpose: input.purpose ?? "login",
  });

  if (error) {
    console.error("[family-login] token insert", error);
    return null;
  }

  return token;
}

export async function requestFamilyLogin(
  email: string,
  returnTo?: string | null,
): Promise<
  | { ok: true }
  | { ok: false; error: string; code?: string }
> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { ok: false, error: "Enter your email address.", code: "INVALID_EMAIL" };
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Service unavailable.", code: "NO_DB" };
  }

  const supabase = createServiceClient();
  const { data: parent } = await supabase
    .from(DAWG_TABLES.parents)
    .select("id, first_name, email")
    .ilike("email", normalized)
    .maybeSingle();

  // Always return success to avoid email enumeration.
  if (!parent) {
    return { ok: true };
  }

  const token = await createFamilyAccessToken({
    parentId: parent.id,
    email: parent.email,
    purpose: "login",
  });

  if (!token) {
    return { ok: false, error: "Could not send login link.", code: "TOKEN_FAILED" };
  }

  if (returnTo) {
    await setAuthReturnCookie(returnTo);
  }

  try {
    await sendFamilyLoginEmail({
      parentEmail: parent.email,
      parentFirstName: parent.first_name ?? "there",
      token,
    });
  } catch (err) {
    console.error("[family-login] email", err);
    return {
      ok: false,
      error: "Could not send login email. Try again later.",
      code: "EMAIL_FAILED",
    };
  }

  return { ok: true };
}

export async function verifyFamilyLoginToken(token: string): Promise<
  | { ok: true; parentId: string }
  | { ok: false; error: string; code?: string }
> {
  if (!token.trim()) {
    return { ok: false, error: "Invalid link.", code: "INVALID_TOKEN" };
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Service unavailable.", code: "NO_DB" };
  }

  const supabase = createServiceClient();
  const tokenHash = hashToken(token);
  const now = new Date().toISOString();

  const { data: row } = await supabase
    .from(DAWG_TABLES.familyLoginTokens)
    .select("id, parent_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  const evaluation = evaluateLoginToken(row, now);
  if (!evaluation.ok) {
    const messages: Record<string, string> = {
      USED: "This link is invalid or already used.",
      EXPIRED: "This link has expired.",
      INVALID: "Invalid link.",
    };
    return {
      ok: false,
      error: messages[evaluation.code],
      code: evaluation.code,
    };
  }

  const { data: claimed, error: claimError } = await supabase
    .from(DAWG_TABLES.familyLoginTokens)
    .update({ used_at: now })
    .eq("id", row!.id)
    .is("used_at", null)
    .gt("expires_at", now)
    .select("parent_id")
    .maybeSingle();

  if (claimError || !claimed) {
    return {
      ok: false,
      error: "This link is invalid or already used.",
      code: "USED",
    };
  }

  const remembered = await rememberFamilyOnDevice({
    parentId: claimed.parent_id,
    agreementsVersion: CURRENT_AGREEMENTS_VERSION,
    mediaConsent: false,
  });

  if ("token" in remembered) {
    await setFamilyDeviceCookie(remembered.token);
  }

  return { ok: true, parentId: claimed.parent_id };
}
