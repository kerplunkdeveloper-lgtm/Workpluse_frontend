// Session access token manager.
// Keeps access token in memory for fast synchronous access and persists to localStorage
// so users remain logged in across page reloads (F5/refresh) without session drop.
let sessionAccessToken: string | null = null;
let sessionHydrated = false;
const ACCESS_TOKEN_KEY = "workpulse_access_token";

export function setSessionAccessToken(token: string | null) {
  sessionAccessToken = token;
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
}

export function getSessionAccessToken(): string | null {
  if (sessionAccessToken) return sessionAccessToken;
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(ACCESS_TOKEN_KEY);
      if (stored) {
        sessionAccessToken = stored;
        return stored;
      }
    } catch {
      // Storage unavailable
    }
  }
  return null;
}

export function markSessionHydrated() {
  sessionHydrated = true;
}

export function isSessionHydrated() {
  return sessionHydrated;
}
