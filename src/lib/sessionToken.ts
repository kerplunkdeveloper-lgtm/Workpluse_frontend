// Access tokens intentionally live only in process memory. Refresh credentials
// are held by the browser as HTTP-only cookies and are never script-readable.
let sessionAccessToken: string | null = null;

export function setSessionAccessToken(token: string | null) {
  sessionAccessToken = token;
}

export function getSessionAccessToken() {
  return sessionAccessToken;
}
