/** Pure token verification rules (safe to unit test). */

export type TokenRow = {
  used_at: string | null;
  expires_at: string;
};

export type TokenVerifyResult =
  | { ok: true }
  | { ok: false; code: "USED" | "EXPIRED" | "INVALID" };

export function evaluateLoginToken(
  row: TokenRow | null | undefined,
  nowIso: string,
): TokenVerifyResult {
  if (!row) {
    return { ok: false, code: "INVALID" };
  }
  if (row.used_at) {
    return { ok: false, code: "USED" };
  }
  if (row.expires_at < nowIso) {
    return { ok: false, code: "EXPIRED" };
  }
  return { ok: true };
}
