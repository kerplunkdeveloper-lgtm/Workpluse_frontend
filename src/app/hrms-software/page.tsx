import type { Metadata } from "next";
import { MarketingSolutionPage } from "@/components/landing/MarketingSolutionPage";
import { MARKETING_PAGES } from "@/components/landing/marketingPages";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata("HRMS Software for Modern Businesses", "Clocked brings attendance, leave, payroll, onboarding and employee operations into one HRMS workspace.", "/hrms-software");
export default function HrmsSoftwarePage() { return <MarketingSolutionPage page={MARKETING_PAGES.hrms} />; }
