import type { Metadata } from "next";
import { PricingClient } from "@/components/landing/PricingClient";
import { SiteFooter } from "@/components/landing/LandingSections";
import { SiteHeader } from "@/components/landing/SiteHeader";
import type { SubscriptionPlanOption } from "@/types";
import { absoluteUrl, marketingMetadata, SEO_SITE_URL } from "@/lib/seo";

export const revalidate = 300;
export const metadata: Metadata = marketingMetadata("Clocked Pricing | HRMS Plans", "Compare Clocked HRMS, attendance and payroll plans for growing businesses and multi-branch teams.", "/pricing");

async function getPlans(): Promise<{ plans: SubscriptionPlanOption[]; unavailable: boolean }> {
  const useLocalApi = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_USE_REMOTE_API !== "true";
  const apiUrl = (useLocalApi ? process.env.NEXT_PUBLIC_LOCAL_API_URL : process.env.NEXT_PUBLIC_API_URL || "")?.replace(/\/+$/, "") || "";
  if (!apiUrl) return { plans: [], unavailable: true };
  try {
    const response = await fetch(`${apiUrl}/auth/plans`, { next: { revalidate: 300 } });
    if (!response.ok) return { plans: [], unavailable: true };
    const data = await response.json();
    return { plans: Array.isArray(data?.plans) ? data.plans : [], unavailable: false };
  } catch {
    return { plans: [], unavailable: true };
  }
}

export default async function PricingPage() {
  const { plans, unavailable } = await getPlans();
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Clocked Pricing",
    url: absoluteUrl("/pricing"),
    isPartOf: { "@type": "WebSite", url: SEO_SITE_URL },
    mainEntity: plans.length ? {
      "@type": "ItemList",
      itemListElement: plans.map((plan, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Offer",
          name: plan.name,
          price: plan.priceMonthly,
          priceCurrency: plan.currency || "INR",
          url: absoluteUrl(`/register?plan=${plan.id}`),
        },
      })),
    } : undefined,
  }).replace(/</g, "\\u003c");

  return (
    <div className="min-h-screen bg-[#fafbfc] font-landing text-slate-900 antialiased">
      <SiteHeader />
      <main>
        <section className="border-b border-slate-200/80 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 px-4 pb-14 pt-20 text-center sm:px-6 lg:px-8 lg:pt-28">
          <p className="inline-flex rounded-full bg-indigo-100 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Simple, transparent pricing</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-6xl">Choose the Clocked plan that fits your workforce</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">Start with the 14-day full-feature trial, then scale from a small team to multi-branch operations with live plan limits and product pricing.</p>
        </section>
        <PricingClient initialPlans={plans} initialUnavailable={unavailable} />
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </div>
  );
}
