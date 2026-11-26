import type { Metadata } from "next";
import { MarketingSolutionPage } from "@/components/landing/MarketingSolutionPage";
import { MARKETING_PAGES } from "@/components/landing/marketingPages";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata("Employee Attendance Software | Clocked", "Track employee attendance across branches, shifts and remote work with Clocked attendance software.", "/employee-attendance-software");
export default function EmployeeAttendanceSoftwarePage() { return <MarketingSolutionPage page={MARKETING_PAGES.attendance} />; }
