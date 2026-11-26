import type { Metadata } from "next";
import { MarketingSolutionPage } from "@/components/landing/MarketingSolutionPage";
import { MARKETING_PAGES } from "@/components/landing/marketingPages";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata("Employee Management Software | Clocked", "Manage employee profiles, onboarding, documents, roles and branches with Clocked.", "/employee-management-software");
export default function EmployeeManagementSoftwarePage() { return <MarketingSolutionPage page={MARKETING_PAGES.employees} />; }
