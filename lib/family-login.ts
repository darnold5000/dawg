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
import {
  sendAccountClaimEmail,
  sendFamilyLoginEmail,
  sendIntakeAccessEmail,
} from "@/lib/email";
import { setAuthReturnCookie } from "@/lib/family-auth";
import { evaluateLoginToken } from "@/lib/family-token-verify";
import { parentHasAnyIntake } from "@/lib/intake";
import {
  findOrCreateParentByEmail,
  getParentByEmail,
  isParentAccountClaimed,
  markParentAccountClaimed,
} from "@/lib/parent-account";
import { sanitizeReturnPath } from "@/lib/family-auth-url";

const TOKEN_TTL_MINUTES = 30;

export type FamilyTokenPurpose = "login" | "claim" | "intake";

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
  const expiresAt = new Date(
    Date.now() + TOKEN_TTL_MINUTES * 60_000,
  ).toISOString();
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

async function sendTokenEmail(input: {
  purpose: FamilyTokenPurpose;
  parentEmail: string;
  parentFirstName: string;
  token: string;
  returnTo: string;
  packageName?: string;
  sessionsTotal?: number;
}) {
  const safeReturn = sanitizeReturnPath(input.returnTo, "/schedule");

  if (input.purpose === "intake") {
    await sendIntakeAccessEmail({
      parentEmail: input.parentEmail,
      parentFirstName: input.parentFirstName,
      token: input.token,
      returnTo: safeReturn,
    });
    return;
  }

  if (input.purpose === "claim") {
    await sendAccountClaimEmail({
      parentEmail: input.parentEmail,
      parentFirstName: input.parentFirstName,
      token: input.token,
      returnTo: safeReturn,
      packageName: input.packageName ?? "DAWG training",
      sessionsTotal: input.sessionsTotal ?? 1,
    });
    return;
  }

  await sendFamilyLoginEmail({
    parentEmail: input.parentEmail,
    parentFirstName: input.parentFirstName,
    token: input.token,
    returnTo: safeReturn,
  });
}

/**
 * Single email entry point: sends intake, claim, or login link based on parent state.
 * Always returns success to avoid email enumeration.
 */
export async function requestFamilyAccessLink(
  email: string,
  returnTo?: string | null,
): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { ok: false, error: "Enter your email address.", code: "INVALID_EMAIL" };
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Service unavailable.", code: "NO_DB" };
  }

  const safeReturn = sanitizeReturnPath(returnTo, "/schedule");
  let parent = await getParentByEmail(normalized);

  if (!parent) {
    parent = await findOrCreateParentByEmail({
      email: normalized,
      firstName: "DAWG",
      lastName: "Family",
      phone: "",
    });
  }

  if (!parent) {
    return { ok: true };
  }

  const hasIntake = await parentHasAnyIntake(parent.id);
  const claimed = await isParentAccountClaimed(parent.id);

  let purpose: FamilyTokenPurpose;
  if (!hasIntake) {
    purpose = "intake";
  } else if (!claimed) {
    purpose = "claim";
  } else {
    purpose = "login";
  }

  const token = await createFamilyAccessToken({
    parentId: parent.id,
    email: parent.email,
    purpose,
  });

  if (!token) {
    return { ok: false, error: "Could not send link.", code: "TOKEN_FAILED" };
  }

  if (returnTo) {
    await setAuthReturnCookie(safeReturn);
  }

  try {
    await sendTokenEmail({
      purpose,
      parentEmail: parent.email,
      parentFirstName: parent.first_name ?? "there",
      token,
      returnTo: safeReturn,
    });
  } catch (err) {
    console.error("[family-login] email", err);
    return {
      ok: false,
      error: "Could not send email. Try again later.",
      code: "EMAIL_FAILED",
    };
  }

  return { ok: true };
}

/** @deprecated Use requestFamilyAccessLink */
export async function requestFamilyLogin(
  email: string,
  returnTo?: string | null,
) {
  return requestFamilyAccessLink(email, returnTo);
}

export async function verifyFamilyLoginToken(token: string): Promise<
  | { ok: true; parentId: string; purpose: FamilyTokenPurpose }
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
    .select("id, parent_id, expires_at, used_at, purpose")
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

  const purpose = (row!.purpose as FamilyTokenPurpose) ?? "login";

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

  if (purpose === "claim") {
    await markParentAccountClaimed(claimed.parent_id);
  }

  const remembered = await rememberFamilyOnDevice({
    parentId: claimed.parent_id,
    agreementsVersion: CURRENT_AGREEMENTS_VERSION,
    mediaConsent: false,
  });

  if ("token" in remembered) {
    await setFamilyDeviceCookie(remembered.token);
  }

  return { ok: true, parentId: claimed.parent_id, purpose };
}
