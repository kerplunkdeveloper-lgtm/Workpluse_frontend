"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const CONSENT_KEY = "workpluse-cookie-consent-v1";
const PUBLIC_PATHS = new Set([
  "/",
  "/hrms-software",
  "/employee-attendance-software",
  "/payroll-software",
  "/leave-management-software",
  "/gps-attendance-software",
  "/employee-management-software",
  "/pricing",
]);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function MarketingAnalytics() {
  const pathname = usePathname();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    if (!measurementId || !PUBLIC_PATHS.has(pathname)) return;
    const onConsentChange = () => window.location.reload();
    window.addEventListener("clocked:consent-changed", onConsentChange);
    let enabled = false;
    try {
      enabled = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || "null")?.analytics === true;
    } catch {
      enabled = false;
    }
    if (!enabled) return () => window.removeEventListener("clocked:consent-changed", onConsentChange);

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));
    if (!document.querySelector(`script[data-ga-id="${measurementId}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.dataset.gaId = measurementId;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.appendChild(script);
    }
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { page_path: pathname });

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      const href = target?.getAttribute("href") || "";
      if (href.startsWith("/register?intent=demo")) {
        window.gtag?.("event", "generate_lead", { method: "demo_request" });
      } else if (href === "/register" || href.startsWith("/register?plan=")) {
        window.gtag?.("event", "sign_up", { method: "marketing_cta" });
      }
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("clocked:consent-changed", onConsentChange);
    };
  }, [measurementId, pathname]);

  return null;
}
