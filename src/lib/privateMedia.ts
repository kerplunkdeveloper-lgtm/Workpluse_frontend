export const isAuthenticatedApiImage = (src?: string | null) =>
  Boolean(src && /^\/api\//i.test(src));

/** Axios already uses a base URL ending in /api. Avoid /api/api/... requests. */
export const toAuthenticatedApiPath = (src: string) =>
  src.replace(/^\/api(?=\/)/i, "");
