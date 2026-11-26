import type { MetadataRoute } from "next";
import { SEO_INDEXING_ENABLED, SEO_SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!SEO_INDEXING_ENABLED) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/platform",
        "/assistant",
        "/approvals",
        "/assets",
        "/attendance",
        "/audit",
        "/branches",
        "/chat",
        "/change-password",
        "/celebrations",
        "/departments",
        "/employees",
        "/expenses",
        "/forgot-password",
        "/holidays",
        "/leaves",
        "/loans",
        "/offboarding",
        "/onboarding",
        "/overtime",
        "/payroll",
        "/permissions",
        "/profile",
        "/reports",
        "/reset-password",
        "/security",
        "/settings",
        "/shifts",
        "/sso",
        "/statutory",
        "/two-factor",
        "/verify-email",
      ],
    },
    sitemap: `${SEO_SITE_URL}/sitemap.xml`,
  };
}
