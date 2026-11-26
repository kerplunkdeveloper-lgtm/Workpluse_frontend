import type { Metadata } from "next";
import { MarketingSolutionPage } from "@/components/landing/MarketingSolutionPage";
import { MARKETING_PAGES } from "@/components/landing/marketingPages";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata("GPS Attendance Software | Clocked", "Use branch geofences and location-aware punch workflows with Clocked GPS attendance software.", "/gps-attendance-software");
export default function GpsAttendanceSoftwarePage() { return <MarketingSolutionPage page={MARKETING_PAGES.gps} />; }
