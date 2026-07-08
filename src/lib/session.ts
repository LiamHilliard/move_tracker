import { createHmac, timingSafeEqual } from "node:crypto";

// Stateless HMAC-signed session token: "v1.<userId>.<tokenVersion>.<issuedAt>.<sig>".
// No DB access here — the proxy verifies signatures on every request, and
// getCurrentUser() does the real user lookup (isActive + tokenVersion check).

export const SESSION_COOKIE = "wt_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionToken(userId: number, tokenVersion: number): string {
  const payload = `v1.${userId}.${tokenVersion}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(
  token: string,
): { userId: number; tokenVersion: number } | null {
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v1") return null;
  const [version, userIdRaw, tokenVersionRaw, issuedAtRaw, sig] = parts;

  const expected = sign(`${version}.${userIdRaw}.${tokenVersionRaw}.${issuedAtRaw}`);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const userId = Number(userIdRaw);
  const tokenVersion = Number(tokenVersionRaw);
  const issuedAt = Number(issuedAtRaw);
  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !Number.isInteger(tokenVersion) ||
    tokenVersion < 0 ||
    !Number.isInteger(issuedAt) ||
    Date.now() - issuedAt > SESSION_MAX_AGE_SECONDS * 1000
  ) {
    return null;
  }
  return { userId, tokenVersion };
}
