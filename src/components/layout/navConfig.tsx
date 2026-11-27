"use client";

import React from "react";

import { INDIA_TIME_ZONE } from "@/lib/utils";





import { LayoutDashboard, Clock, CalendarDays, Receipt, Users, Building2, CalendarRange, Calendar, SlidersHorizontal, UserPlus, UserRound, BarChart3, Settings, History, ShieldCheck, KeyRound, MapPin, Layers, UserMinus, Laptop, FolderTree, MessageSquare, Landmark, HandCoins, CreditCard, Award, FileText, Sparkles, LifeBuoy } from "lucide-react";














export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  hint: string;
  keywords?: string[];
  badge?: string;
  badgeColor?: string;
  roles?: string[];
  feature?: "hasPayroll" | "hasApiAccess" | "hasShiftPlanner" | "hasGeofence";
}

export interface NavSection {
  id: string;
  title: string;
  blurb: string;
  dot: string;
  glow: string;
  items: NavItem[];
}

// Keep team-management pages restricted while exposing the employee's own
// attendance, leave, payroll, claims, loans and communication self-service.
export const COMPANY_ADMIN_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"];

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "my-work",
    title: "Workspace",
    blurb: "Daily operations & staff desk",
    dot: "bg-indigo-400",
    glow: "rgba(99, 102, 241, 0.4)",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, hint: "Today’s attendance, approvals, and payroll overview", keywords: ["home", "overview"] },
      { label: "Profile", href: "/profile", icon: UserRound, hint: "Update your personal details, documents, assets, and resignation", keywords: ["profile", "documents", "personal", "account"], roles: ["COMPANY_ADMIN", "MANAGER", "HR", "EMPLOYEE"] },
      { label: "Attendance", href: "/attendance", icon: Clock, hint: "Review attendance, punches, and timesheets", keywords: ["punch", "clock", "timesheet"], roles: [...COMPANY_ADMIN_ROLES, "EMPLOYEE"] },
      { label: "Leaves", href: "/leaves", icon: CalendarDays, hint: "Apply for leave and view your time-off history", keywords: ["leave", "vacation", "time off", "shoot"], roles: [...COMPANY_ADMIN_ROLES, "EMPLOYEE"] },
      { label: "Chat", href: "/chat", icon: MessageSquare, hint: "Company communication and announcements", keywords: ["message", "inbox"], roles: [...COMPANY_ADMIN_ROLES, "EMPLOYEE"], badge: "Live", badgeColor: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" },
    ],
  },
  {
    id: "pay",
    title: "Team & Payroll",
    blurb: "Salary, claims, and appraisals",
    dot: "bg-emerald-400",
    glow: "rgba(16, 185, 129, 0.4)",
    items: [
      { label: "Payroll", href: "/payroll", icon: Receipt, hint: "Automated payroll runs and payslip distribution", keywords: ["salary", "payslip", "pay"], feature: "hasPayroll", badge: "Auto", badgeColor: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" },
      { label: "Loans", href: "/loans", icon: HandCoins, hint: "Request salary advances and view EMI deductions", keywords: ["advance", "loan"], roles: [...COMPANY_ADMIN_ROLES, "EMPLOYEE"] },
      { label: "Statutory", href: "/statutory", icon: Landmark, hint: "PF, ESI, Professional Tax, and compliance registers", keywords: ["pf", "esi", "tax", "compliance"], roles: COMPANY_ADMIN_ROLES, feature: "hasPayroll" },
      { label: "Expenses", href: "/expenses", icon: CreditCard, hint: "Submit claims and review reimbursements", keywords: ["claim", "reimburse"], roles: [...COMPANY_ADMIN_ROLES, "EMPLOYEE"] },
      { label: "Overtime", href: "/overtime", icon: Layers, hint: "Request overtime and view comp-off balances", keywords: ["ot", "comp off"], roles: [...COMPANY_ADMIN_ROLES, "EMPLOYEE"] },
      { label: "Appraisals", href: "/appraisals", icon: Award, hint: "Complete self-reviews and view performance feedback", keywords: ["review", "performance"], roles: [...COMPANY_ADMIN_ROLES, "EMPLOYEE"] },
    ],
  },
  {
    id: "people",
    title: "People Operations",
    blurb: "Talent lifecycle and approvals",
    dot: "bg-violet-400",
    glow: "rgba(139, 92, 246, 0.4)",
    items: [
      { label: "Approvals", href: "/approvals", icon: ShieldCheck, hint: "HR clearance inbox for leaves and expenses", keywords: ["inbox", "requests"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"], badge: "Inbox", badgeColor: "bg-amber-500/20 text-amber-300 border border-amber-500/30" },
      { label: "Employees", href: "/employees", icon: Users, hint: "Full employee directory and staff directory", keywords: ["employee", "staff", "directory"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"] },
      { label: "Celebrations", href: "/celebrations", icon: Sparkles, hint: "Birthdays, work anniversaries, and branded wishes", keywords: ["birthday", "anniversary", "wishes", "cards", "recognition"], roles: COMPANY_ADMIN_ROLES },
      { label: "Departments", href: "/departments", icon: FolderTree, hint: "Organizational structure and teams", keywords: ["team", "org"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"] },
      { label: "Onboarding", href: "/onboarding", icon: UserPlus, hint: "New hire workflows and document collection", keywords: ["hire", "joining"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"] },
      { label: "Offboarding", href: "/offboarding", icon: UserMinus, hint: "Exit clearance, checklist, and resignation handover", keywords: ["exit", "resign"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"] },
    ],
  },
  {
    id: "workplace",
    title: "Workplace",
    blurb: "Schedules, locations, and assets",
    dot: "bg-amber-400",
    glow: "rgba(245, 158, 11, 0.4)",
    items: [
      { label: "Shifts", href: "/shifts", icon: CalendarRange, hint: "Shift schedules, rotations, and rosters", keywords: ["roster", "schedule"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"] },
      { label: "Branches", href: "/branches", icon: MapPin, hint: "Office locations with GPS geofencing radius", keywords: ["office", "location", "geo"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"] },
      { label: "Holidays", href: "/holidays", icon: Calendar, hint: "View the public holiday and company off calendar", keywords: ["holiday"], roles: [...COMPANY_ADMIN_ROLES, "EMPLOYEE"] },
      { label: "Policy", href: "/policy", icon: SlidersHorizontal, hint: "Attendance rules, leave eligibility, and deduction policy", keywords: ["rules", "settings", "leave eligibility"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"] },
      { label: "Assets", href: "/assets", icon: Laptop, hint: "Hardware inventory and laptop assignments", keywords: ["laptop", "device", "inventory"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"] },
    ],
  },
  {
    id: "insights",
    title: "Insights & Admin",
    blurb: "Reports, billing, and settings",
    dot: "bg-sky-400",
    glow: "rgba(14, 165, 233, 0.4)",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3, hint: "Daily logs and monthly muster roll PDF exports", keywords: ["analytics", "export"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"], badge: "PDF", badgeColor: "bg-sky-500/20 text-sky-300 border border-sky-500/30" },
      { label: "Settings", href: "/settings", icon: Settings, hint: "Organization profile, subscription tier, and API keys", keywords: ["plan", "billing", "company"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
      { label: "Audit log", href: "/audit", icon: History, hint: "Who changed what, and when, across your workspace", keywords: ["history", "activity", "security", "changes", "log"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"] },
      { label: "Permissions", href: "/permissions", icon: KeyRound, hint: "Granular role access controls and privileges", keywords: ["access", "roles", "security"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"] },
      { label: "Support", href: "/support", icon: LifeBuoy, hint: "Report an issue, follow tickets, and get help", keywords: ["help", "ticket", "issue", "bug", "support"], roles: ["COMPANY_ADMIN", "MANAGER", "HR"] },
      { label: "Developer support", href: "/developer/dashboard", icon: LifeBuoy, hint: "Resolve support tickets across customer workspaces", keywords: ["developer", "support", "tickets", "queue"], roles: ["DEVELOPER"] },
    ],
  },
];

/** The platform owner sees only the platform tools, never a customer's workspace menu. */
export const PLATFORM_SECTIONS: NavSection[] = [
  {
    id: "platform",
    title: "Platform",
    blurb: "Customers, plans and pricing",
    dot: "bg-rose-400",
    glow: "rgba(244, 63, 94, 0.4)",
    items: [
      { label: "Clients", href: "/platform/clients", icon: Building2, hint: "Every customer workspace, plan, seats and payments", keywords: ["customers", "tenants", "revenue", "mrr", "suspend", "trial"] },
      { label: "Pricing & offers", href: "/platform/billing", icon: CreditCard, hint: "Plan prices and discount codes", keywords: ["pricing", "coupon", "offer", "plans"] },
      { label: "Activity", href: "/platform/activity", icon: History, hint: "Every owner action on a client, with who and why", keywords: ["audit", "log", "history", "suspend"] },
      { label: "Security", href: "/platform/security", icon: KeyRound, hint: "Two-step verification and platform security", keywords: ["2fa", "totp", "authenticator", "security"] },
      { label: "Developers", href: "/platform/developers", icon: Users, hint: "Create and manage support developer accounts", keywords: ["developer", "support", "accounts"] },
    ],
  },
];

export const DEVELOPER_SECTIONS: NavSection[] = [
  {
    id: "developer-support",
    title: "Support operations",
    blurb: "Customer issue resolution",
    dot: "bg-indigo-400",
    glow: "rgba(99, 102, 241, 0.4)",
    items: [{ label: "Support queue", href: "/developer/dashboard", icon: LifeBuoy, hint: "Resolve support tickets across customer workspaces", keywords: ["developer", "support", "tickets", "queue"] }],
  },
];

export const DESKTOP_NAV_SCROLL_KEY = "wp-desktop-nav-scroll";

export const MOBILE_NAV_SCROLL_KEY = "wp-mobile-nav-scroll";

export function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  const [targetPath, targetQuery] = href.split("?");
  const [currentPath, currentQuery = ""] = pathname.split("?");
  if (targetQuery) {
    const target = new URLSearchParams(targetQuery);
    const current = new URLSearchParams(currentQuery);
    return currentPath === targetPath && target.get("tab") === current.get("tab");
  }
  if (currentQuery) return false;
  if (currentPath === targetPath) return true;
  return targetPath !== "/dashboard" && currentPath.startsWith(targetPath);
}

export function itemVisible(
  item: NavItem,
  role?: string | null,
  features?: { hasPayroll?: boolean; hasApiAccess?: boolean; hasShiftPlanner?: boolean; hasGeofence?: boolean } | null,
) {
  if (item.roles && (!role || !item.roles.includes(role))) return false;
  if (item.feature && features && features[item.feature] === false) return false;
  return true;
}

export function itemMatches(item: NavItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.label.toLowerCase().includes(q) ||
    item.hint.toLowerCase().includes(q) ||
    (item.keywords || []).some((word) => word.includes(q) || q.includes(word))
  );
}

/** Stable relative notification time. Floor elapsed units so "3 h" is not shown before 3 full hours. */
export function timeAgo(value?: string) {
  // API timestamps are UTC ISO strings. Keep relative time device-independent;
  // absolute timestamps below are always rendered in the company timezone.
  const time = value ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(time)) return "";
  const elapsed = Date.now() - time;
  if (elapsed < 60000) return "just now";
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ago`;
  return new Date(time).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: INDIA_TIME_ZONE,
    timeZoneName: "short",
  });
}
