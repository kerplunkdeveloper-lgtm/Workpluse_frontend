import type { Metadata } from "next";
import { Hero, ProofBar, Features, Workflow, Offline, Security, FAQ, CtaBand, SiteFooter } from "@/components/landing/LandingSections";
import { PricingClient } from "@/components/landing/PricingClient";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { FAQ as FAQ_ITEMS } from "@/components/landing/content";
import type { SubscriptionPlanOption } from "@/types";
import { absoluteUrl, SEO_INDEXING_ENABLED, SEO_SITE_URL } from "@/lib/seo";

export const revalidate = 300;

const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");

export const metadata: Metadata = {
  title: "Clocked | HRMS, Attendance & Payroll Software",
  description: "Manage employee attendance, payroll, leave, onboarding and HR operations with Clocked. All-in-one HRMS software for modern businesses.",
  alternates: { canonical: SEO_SITE_URL },
  robots: SEO_INDEXING_ENABLED ? { index: true, follow: true } : { index: false, follow: false },
};

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

export default async function LandingPage() {
  const { plans, unavailable } = await getPlans();
  const siteUrl = SEO_SITE_URL;
  const offers = plans.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    price: plan.priceMonthly,
    priceCurrency: plan.currency || "INR",
    url: absoluteUrl("/register?plan=" + plan.id),
  }));

  return (
    // overflow-x-clip (not hidden) so the sticky header and sticky FAQ column keep working.
    <div className="lp-grain relative isolate min-h-screen overflow-x-clip bg-[#fafbfc] font-landing text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
      <a href="#main" className="sr-only z-[70] rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <ProofBar />
        <Features />
        <Workflow />
        <Offline />
        <PricingClient initialPlans={plans} initialUnavailable={unavailable} />
        <Security />
        <FAQ />
        <CtaBand />
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: jsonLd({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${siteUrl}/#organization`,
              name: "Clocked",
              url: siteUrl,
              logo: `${siteUrl}/logo-v2-128.png`,
            },
            {
              "@type": "SoftwareApplication",
              "@id": `${siteUrl}/#software`,
              name: "Clocked",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Android",
              publisher: { "@id": `${siteUrl}/#organization` },
              offers,
            },
            {
              "@type": "WebSite",
              "@id": `${siteUrl}/#website`,
              name: "Clocked",
              url: siteUrl,
              publisher: { "@id": `${siteUrl}/#organization` },
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQ_ITEMS.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
              })),
            },
          ],
        }),
      }} />
    </div>
  );
}
