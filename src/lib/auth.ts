export const AUTH_COOKIE = "wt_auth";

// The cookie stores a SHA-256 hash of the passcode, so the raw passcode
// never sits on the device. Uses Web Crypto so it runs in edge middleware.
export async function passcodeHash(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`watch-tracker:${passcode}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
