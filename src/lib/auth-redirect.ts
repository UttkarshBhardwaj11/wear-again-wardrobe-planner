import { oauthReturnPath } from "./oauth-return-path";

const KEY = "mobidrobe:after-auth";

/** Only same-origin app paths are allowed as post-sign-in destinations. */
export function safeAppPath(value: unknown, fallback = "/home"): string {
  if (typeof value !== "string") return fallback;
  const path = oauthReturnPath(value);
  if (path === "/" && value !== "/") return fallback;
  if (path.startsWith("/auth") || path.startsWith("/reset-password")) return fallback;
  return path;
}

export function rememberAfterAuth(path: string) {
  try {
    sessionStorage.setItem(KEY, safeAppPath(path));
  } catch {
    // ignore
  }
}

export function takeAfterAuth(): string | null {
  try {
    const v = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return v ? safeAppPath(v) : null;
  } catch {
    return null;
  }
}
