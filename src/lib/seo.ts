export const SEO_SITE_URL = "https://goclocked.com";
export const SEO_LAST_MODIFIED = new Date("2026-11-26T00:00:00.000Z");

/** Indexing is opt-in so alpha, preview and development builds stay private. */
export const SEO_INDEXING_ENABLED =
  process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true" &&
  process.env.NEXT_PUBLIC_SITE_URL === SEO_SITE_URL;

export const absoluteUrl = (path = "") =>
  `${SEO_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const publicMarketingPaths = [
  "/",
  "/hrms-software",
  "/employee-attendance-software",
  "/payroll-software",
  "/leave-management-software",
  "/gps-attendance-software",
  "/employee-management-software",
  "/pricing",
  "/privacy",
  "/terms",
  "/cookies",
] as const;

export const marketingMetadata = (title: string, description: string, path: string) => ({
  title,
  description,
  alternates: { canonical: absoluteUrl(path) },
  robots: SEO_INDEXING_ENABLED
    ? { index: true, follow: true }
    : { index: false, follow: false },
});
