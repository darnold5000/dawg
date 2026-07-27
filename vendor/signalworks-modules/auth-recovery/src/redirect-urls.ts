export type PasswordResetRedirectOptions = {
  siteUrl: string;
  resetPath: string;
  /**
   * When set, recovery links land on this path first (e.g. `/auth/callback`)
   * with `next` pointing at `resetPath`. When omitted, redirect goes straight
   * to `resetPath` on the site origin.
   */
  callbackPath?: string;
};

export function passwordResetRedirectUrl(
  options: PasswordResetRedirectOptions,
): string {
  const origin = options.siteUrl.replace(/\/$/, "");
  const reset = options.resetPath.startsWith("/")
    ? options.resetPath
    : `/${options.resetPath}`;

  if (options.callbackPath) {
    const callback = options.callbackPath.startsWith("/")
      ? options.callbackPath
      : `/${options.callbackPath}`;
    return `${origin}${callback}?next=${encodeURIComponent(reset)}`;
  }

  return `${origin}${reset}`;
}
