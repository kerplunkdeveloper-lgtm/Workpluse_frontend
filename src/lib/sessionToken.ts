// Keep the access token available across a full localhost/browser refresh.
// The refresh token remains server-managed in an HTTP-only cookie; this value
// is only the short-lived bearer token used to call the API.
let sessionAccessToken: string | null = null;
let sessionHydrated = false;
const ACCESS_TOKEN_KEY = "workpulse_access_token";

export function setSessionAccessToken(token: string | null) {
  sessionAccessToken = token;
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getSessionAccessToken() {
  if (!sessionAccessToken && typeof window !== "undefined") {
    sessionAccessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return sessionAccessToken;
}

export function markSessionHydrated() {
  sessionHydrated = true;
}

export function isSessionHydrated() {
  return sessionHydrated;
}
