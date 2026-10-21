// The short-lived access token lives only in memory so a script injected into
// the page cannot read it back out of storage. After a full reload AuthProvider
// restores the session through /auth/refresh, which uses the server-managed
// HTTP-only refresh cookie.
let sessionAccessToken: string | null = null;
let sessionHydrated = false;
const LEGACY_ACCESS_TOKEN_KEY = "workpulse_access_token";

// Releases before in-memory sessions persisted the token; drop that copy.
function clearLegacyStoredToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
}
clearLegacyStoredToken();

export function setSessionAccessToken(token: string | null) {
  sessionAccessToken = token;
}

export function getSessionAccessToken() {
  return sessionAccessToken;
}

export function markSessionHydrated() {
  sessionHydrated = true;
}

export function isSessionHydrated() {
  return sessionHydrated;
}
