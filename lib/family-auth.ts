import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  loadRememberedFamily,
  type RememberedFamily,
} from "@/lib/family-device";
import { parentHasAnyIntake } from "@/lib/intake";
import {
  loginPath,
  registerPath,
  sanitizeReturnPath,
} from "@/lib/family-auth-url";

export { loginPath, registerPath, sanitizeReturnPath } from "@/lib/family-auth-url";

export const AUTH_RETURN_COOKIE = "dawg_auth_return";
const RETURN_MAX_AGE_SEC = 60 * 60; // 1 hour

export async function setAuthReturnCookie(returnTo: string) {
  const jar = await cookies();
  jar.set(AUTH_RETURN_COOKIE, sanitizeReturnPath(returnTo), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RETURN_MAX_AGE_SEC,
  });
}

export async function consumeAuthReturnCookie(
  fallback = "/schedule",
): Promise<string> {
  const jar = await cookies();
  const value = jar.get(AUTH_RETURN_COOKIE)?.value;
  jar.set(AUTH_RETURN_COOKIE, "", { path: "/", maxAge: 0 });
  return sanitizeReturnPath(value, fallback);
}

export async function getAuthenticatedFamily(): Promise<RememberedFamily | null> {
  return loadRememberedFamily();
}

export async function getAuthenticatedParentId(): Promise<string | null> {
  const family = await getAuthenticatedFamily();
  return family?.parentId ?? null;
}

/** Redirect to login if not signed in. */
export async function requireFamilyPageAuth(returnTo: string): Promise<RememberedFamily> {
  const family = await getAuthenticatedFamily();
  if (!family) {
    redirect(loginPath(returnTo));
  }
  return family;
}

/** Redirect to register if signed in but intake not completed. */
export async function requireFamilyWithIntake(returnTo: string): Promise<RememberedFamily> {
  const family = await requireFamilyPageAuth(returnTo);
  const hasIntake = await parentHasAnyIntake(family.parentId);
  if (!hasIntake) {
    redirect(registerPath(returnTo));
  }
  return family;
}

export async function requireFamilySessionApi(): Promise<
  RememberedFamily | NextResponse
> {
  const family = await getAuthenticatedFamily();
  if (!family) {
    return NextResponse.json(
      { error: "Sign in to continue.", code: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }
  return family;
}

export function parentEmailMatches(
  family: RememberedFamily,
  email: string,
): boolean {
  return family.parentEmail.trim().toLowerCase() === email.trim().toLowerCase();
}
