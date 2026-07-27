import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthHashError = {
  error: string;
  errorCode: string | null;
  errorDescription: string | null;
};

export function parseHashAuthError(hash: string): AuthHashError | null {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!trimmed) return null;

  const params = new URLSearchParams(trimmed);
  const error = params.get("error");
  if (!error) return null;

  return {
    error,
    errorCode: params.get("error_code"),
    errorDescription: params.get("error_description"),
  };
}

export function messageForAuthHashError(hashError: AuthHashError): string {
  if (hashError.errorCode === "otp_expired") {
    return "This reset link has expired or was already used. Request a new one from Forgot password.";
  }

  if (hashError.error === "access_denied") {
    const description = hashError.errorDescription?.replaceAll("+", " ").trim();
    if (description) return description;
    return "This reset link is no longer valid.";
  }

  const description = hashError.errorDescription?.replaceAll("+", " ").trim();
  return description ?? "This reset link is no longer valid.";
}

export type OtpVerifyType =
  | "invite"
  | "recovery"
  | "email"
  | "signup"
  | "magiclink";

export function parseHashSessionTokens(hash: string): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!trimmed) {
    return { accessToken: null, refreshToken: null };
  }

  const params = new URLSearchParams(trimmed);
  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
  };
}

export function isOtpVerifyType(value: string | null): value is OtpVerifyType {
  return (
    value === "invite" ||
    value === "recovery" ||
    value === "email" ||
    value === "signup" ||
    value === "magiclink"
  );
}

/**
 * Apply tokens from a Supabase recovery / magic-link redirect on the current page.
 */
export async function establishSessionFromAuthRedirect(
  supabase: SupabaseClient,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = new URL(window.location.href);

  const hashError = parseHashAuthError(window.location.hash);
  if (hashError) {
    return { ok: false, message: messageForAuthHashError(hashError) };
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
    console.error("[reset-password] exchangeCodeForSession", exchangeError.message);
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
    console.error("[reset-password] verifyOtp", verifyError.message);
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
    console.error("[reset-password] setSession", sessionError.message);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return { ok: true };
  }

  return {
    ok: false,
    message:
      "This reset link is invalid or has expired. Request a new one from Forgot password.",
  };
}
