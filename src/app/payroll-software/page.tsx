import type { Metadata } from "next";
import { MarketingSolutionPage } from "@/components/landing/MarketingSolutionPage";
import { MARKETING_PAGES } from "@/components/landing/marketingPages";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata("Payroll Software | Clocked", "Connect attendance, leave, overtime and employee records with Clocked payroll software.", "/payroll-software");
export default function PayrollSoftwarePage() { return <MarketingSolutionPage page={MARKETING_PAGES.payroll} />; }
