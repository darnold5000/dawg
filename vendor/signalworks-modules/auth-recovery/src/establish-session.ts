import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isOtpVerifyType,
  messageForAuthHashError,
  parseHashAuthError,
  parseHashSessionTokens,
  type AuthHashErrorMessages,
} from "./hash";

export type EstablishSessionResult =
  | { ok: true }
  | { ok: false; message: string };

export type EstablishSessionOptions = {
  hashErrorMessages?: AuthHashErrorMessages;
  invalidLinkMessage?: string;
  logTag?: string;
};

/**
 * Browser-only: apply Supabase recovery / magic-link tokens from the current URL.
 */
export async function establishSessionFromAuthRedirect(
  supabase: SupabaseClient,
  options: EstablishSessionOptions = {},
): Promise<EstablishSessionResult> {
  const logTag = options.logTag ?? "auth-recovery";
  const invalidLinkMessage =
    options.invalidLinkMessage ??
    "This link is invalid or has expired. Request a new one from Forgot password.";

  const url = new URL(window.location.href);

  const hashError = parseHashAuthError(window.location.hash);
  if (hashError) {
    return {
      ok: false,
      message: messageForAuthHashError(hashError, options.hashErrorMessages),
    };
  }

  await supabase.auth.signOut({ scope: "local" });

  const code = url.searchParams.get("code");
  if (code) {
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      window.history.replaceState(null, "", url.pathname);
      return { ok: true };
    }
    console.error(`[${logTag}] exchangeCodeForSession`, exchangeError.message);
  }

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (tokenHash && isOtpVerifyType(type)) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!verifyError) {
      window.history.replaceState(null, "", url.pathname);
      return { ok: true };
    }
    console.error(`[${logTag}] verifyOtp`, verifyError.message);
  }

  const { accessToken, refreshToken } = parseHashSessionTokens(
    window.location.hash,
  );
  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!sessionError) {
      window.history.replaceState(null, "", url.pathname);
      return { ok: true };
    }
    console.error(`[${logTag}] setSession`, sessionError.message);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return { ok: true };
  }

  return { ok: false, message: invalidLinkMessage };
}
