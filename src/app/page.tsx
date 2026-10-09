import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Hero, ProofBar, Features, Workflow, Offline, Security, FAQ, CtaBand, SiteFooter } from "@/components/landing/LandingSections";
import { PricingClient } from "@/components/landing/PricingClient";
import { SiteHeader } from "@/components/landing/SiteHeader";
import type { SubscriptionPlanOption } from "@/types";

export const revalidate = 300;

const sans = Geist({ subsets: ["latin"], variable: "--wp-font-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--wp-font-serif", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--wp-font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Workforce attendance, leave and payroll",
  description: "WorkPulse keeps Indian teams in rhythm with geofenced attendance, offline punches, leave and payroll in one focused workspace.",
  alternates: { canonical: "/" },
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
  const offers = plans.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    price: plan.priceMonthly,
    priceCurrency: plan.currency || "INR",
    url: "/register?plan=" + plan.id,
  }));

  return (
    // overflow-x-clip (not hidden) so the sticky header and sticky FAQ column keep working.
    <div className={`${sans.variable} ${serif.variable} ${mono.variable} lp-grain relative isolate min-h-screen overflow-x-clip bg-[#f6f7f9] font-landing text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900`}>
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
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "WorkPulse",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, Android",
          offers,
        }),
      }} />
    </div>
  );
}
