import type { MetadataRoute } from "next";
import { publicMarketingPaths, SEO_INDEXING_ENABLED, SEO_LAST_MODIFIED, SEO_SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!SEO_INDEXING_ENABLED) return [];
  return publicMarketingPaths.map((path) => ({
    url: `${SEO_SITE_URL}${path}`,
    lastModified: SEO_LAST_MODIFIED,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/pricing" ? 0.9 : 0.7,
  }));
}
