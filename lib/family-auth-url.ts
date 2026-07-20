function isSafeReturnPath(path: string | null | undefined): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

export function sanitizeReturnPath(
  path: string | null | undefined,
  fallback = "/schedule",
): string {
  return isSafeReturnPath(path) ? path : fallback;
}

export function loginPath(returnTo?: string | null): string {
  const safe = sanitizeReturnPath(returnTo, "/schedule");
  return `/my/login?return=${encodeURIComponent(safe)}`;
}

export function registerPath(returnTo?: string | null): string {
  const safe = sanitizeReturnPath(returnTo, "/schedule");
  return `/my/register?return=${encodeURIComponent(safe)}`;
}

export function bookLoginPath(sessionId: string, waitlist = false): string {
  const target = `/book/${sessionId}${waitlist ? "?waitlist=1" : ""}`;
  return loginPath(target);
}
