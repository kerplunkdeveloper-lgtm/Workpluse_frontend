import type { Metadata } from "next";
import { MarketingSolutionPage } from "@/components/landing/MarketingSolutionPage";
import { MARKETING_PAGES } from "@/components/landing/marketingPages";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata("Leave Management Software | Clocked", "Manage leave requests, balances and approvals with Clocked leave management software.", "/leave-management-software");
export default function LeaveManagementSoftwarePage() { return <MarketingSolutionPage page={MARKETING_PAGES.leave} />; }
