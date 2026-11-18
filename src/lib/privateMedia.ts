export const isAuthenticatedApiImage = (src?: string | null) =>
  Boolean(src && /^\/api\//i.test(src));
