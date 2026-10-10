"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Brand from "@/components/ui/Brand";
import { useAttendance } from "@/context/AttendanceContext";
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Receipt,
  Users,
  Building2,
  CalendarRange,
  Calendar,
  SlidersHorizontal,
  UserPlus,
  BarChart3,
  Settings,
  Bell,
  History,
  LogOut,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  MapPin,
  Coffee,
  Menu,
  X,
  Layers,
  FileCheck2,
  UserMinus,
  Laptop,
  FolderTree,
  Search,
  MessageSquare,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  CircleUser,
  Landmark,
  HandCoins,
  CreditCard,
  Award,
  Command,
  Home,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { employeesApi, notificationsApi } from "@/lib/api";
import { NotificationItem } from "@/types";
import { unwrapList } from "@/lib/utils";
import PunchConfirmDialog, { PunchConfirmAction } from "@/components/attendance/PunchConfirmDialog";
import { SubscriptionBanner } from "@/components/billing/WorkspaceBilling";
import CommandPalette from "./CommandPalette";
import CompanyLogo from "@/components/ui/CompanyLogo";
import ShortcutsHelpModal from "./ShortcutsHelpModal";

interface NavItem {
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

interface NavSection {
  id: string;
  title: string;
  blurb: string;
  dot: string;
  glow: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: "my-work",
    title: "Workspace",
    blurb: "Daily operations & staff desk",
    dot: "bg-indigo-400",
    glow: "rgba(99, 102, 241, 0.4)",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, hint: "Today’s attendance, approvals, and payroll overview", keywords: ["home", "overview"] },
      { label: "Attendance", href: "/attendance", icon: Clock, hint: "Clock in, punch history, and timesheet records", keywords: ["punch", "clock", "timesheet"] },
      { label: "Leaves", href: "/leaves", icon: CalendarDays, hint: "Apply, balances, and team leave calendar", keywords: ["leave", "vacation", "time off"] },
      { label: "Chat", href: "/chat", icon: MessageSquare, hint: "Real-time communication with colleagues", keywords: ["message", "inbox"], badge: "Live", badgeColor: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" },
      { label: "Profile", href: "/profile", icon: CircleUser, hint: "Personal credentials, salary slips, and files", keywords: ["me", "account", "docs"] },
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
      { label: "Loans", href: "/loans", icon: HandCoins, hint: "Salary advances and EMI deductions", keywords: ["advance", "loan"] },
      { label: "Statutory", href: "/statutory", icon: Landmark, hint: "PF, ESI, Professional Tax, and compliance registers", keywords: ["pf", "esi", "tax", "compliance"], feature: "hasPayroll" },
      { label: "Expenses", href: "/expenses", icon: CreditCard, hint: "Employee reimbursements and receipt claims", keywords: ["claim", "reimburse"] },
      { label: "Overtime", href: "/overtime", icon: Layers, hint: "Extra working hours and comp-off balances", keywords: ["ot", "comp off"] },
      { label: "Appraisals", href: "/appraisals", icon: Award, hint: "Periodic reviews, ratings, and performance goals", keywords: ["review", "performance"] },
    ],
  },
  {
    id: "people",
    title: "People Operations",
    blurb: "Talent lifecycle and approvals",
    dot: "bg-violet-400",
    glow: "rgba(139, 92, 246, 0.4)",
    items: [
      { label: "Approvals", href: "/approvals", icon: ShieldCheck, hint: "HR clearance inbox for leaves and expenses", keywords: ["inbox", "requests"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"], badge: "Inbox", badgeColor: "bg-amber-500/20 text-amber-300 border border-amber-500/30" },
      { label: "Employees", href: "/employees", icon: Users, hint: "Full employee directory and staff directory", keywords: ["employee", "staff", "directory"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
      { label: "Departments", href: "/departments", icon: FolderTree, hint: "Organizational structure and teams", keywords: ["team", "org"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
      { label: "Onboarding", href: "/onboarding", icon: UserPlus, hint: "New hire workflows and document collection", keywords: ["hire", "joining"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
      { label: "Offboarding", href: "/offboarding", icon: UserMinus, hint: "Exit clearance, checklist, and resignation handover", keywords: ["exit", "resign"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
    ],
  },
  {
    id: "workplace",
    title: "Workplace",
    blurb: "Schedules, locations, and assets",
    dot: "bg-amber-400",
    glow: "rgba(245, 158, 11, 0.4)",
    items: [
      { label: "Shifts", href: "/shifts", icon: CalendarRange, hint: "Shift schedules, rotations, and rosters", keywords: ["roster", "schedule"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
      { label: "Branches", href: "/branches", icon: MapPin, hint: "Office locations with GPS geofencing radius", keywords: ["office", "location", "geo"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
      { label: "Holidays", href: "/holidays", icon: Calendar, hint: "Public holiday and company off calendar", keywords: ["holiday"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
      { label: "Policy", href: "/policy", icon: SlidersHorizontal, hint: "Attendance rules, grace limits, and deduction policy", keywords: ["rules", "settings"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
      { label: "Assets", href: "/assets", icon: Laptop, hint: "Hardware inventory and laptop assignments", keywords: ["laptop", "device", "inventory"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
    ],
  },
  {
    id: "insights",
    title: "Insights & Admin",
    blurb: "Reports, billing, and settings",
    dot: "bg-sky-400",
    glow: "rgba(14, 165, 233, 0.4)",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3, hint: "Daily logs and monthly muster roll PDF exports", keywords: ["analytics", "export"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"], badge: "PDF", badgeColor: "bg-sky-500/20 text-sky-300 border border-sky-500/30" },
      { label: "Settings", href: "/settings", icon: Settings, hint: "Organization profile, subscription tier, and API keys", keywords: ["plan", "billing", "company"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
      { label: "Permissions", href: "/permissions", icon: KeyRound, hint: "Granular role access controls and privileges", keywords: ["access", "roles", "security"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
    ],
  },
];

/** The platform owner sees only the platform tools, never a customer's workspace menu. */
const PLATFORM_SECTIONS: NavSection[] = [
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
    ],
  },
];

const DESKTOP_NAV_SCROLL_KEY = "wp-desktop-nav-scroll";
const MOBILE_NAV_SCROLL_KEY = "wp-mobile-nav-scroll";

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (pathname === href) return true;
  return href !== "/dashboard" && pathname.startsWith(href);
}

function itemVisible(
  item: NavItem,
  role?: string | null,
  features?: { hasPayroll?: boolean; hasApiAccess?: boolean; hasShiftPlanner?: boolean; hasGeofence?: boolean } | null,
) {
  if (item.roles && (!role || !item.roles.includes(role))) return false;
  if (item.feature && features && features[item.feature] === false) return false;
  return true;
}

function itemMatches(item: NavItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.label.toLowerCase().includes(q) ||
    item.hint.toLowerCase().includes(q) ||
    (item.keywords || []).some((word) => word.includes(q) || q.includes(word))
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const isPlatformOwner = role === "SUPER_ADMIN";
  const { todayStatus, checkIn, checkOut, startBreak, endBreak, isActionLoading, isWithinGeofence, locationLabel } = useAttendance();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [navQuery, setNavQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingPunch, setPendingPunch] = useState<PunchConfirmAction | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(["my-work", "pay", "people", "workplace", "insights"]);
  const [seatCount, setSeatCount] = useState<number | null>(null);

  const desktopNavRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const restoringNavScrollRef = useRef(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("wp-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: Open Command Palette
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      // Ctrl+B or Cmd+B: Toggle Sidebar
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
      }
      // Shift+? or ?: Open Shortcuts modal (when not inside an input)
      else if (event.key === "?" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
      }
      // Slash (/): Focus sidebar filter (when not inside an input)
      else if (event.key === "/" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        const searchInput = document.getElementById("wp-sidebar-filter-input");
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  // Section open state synchronization
  useEffect(() => {
    const activeId = NAV_SECTIONS.find((section) =>
      section.items.some((item) => isNavActive(pathname, item.href))
    )?.id;
    let next = ["my-work"];
    try {
      const saved = JSON.parse(localStorage.getItem("wp-nav-open") || "");
      if (Array.isArray(saved) && saved.every((id) => typeof id === "string") && saved.length) {
        next = saved;
      }
    } catch {
      // keep defaults
    }
    if (activeId && !next.includes(activeId)) next = [...next, activeId];
    setOpenSections(next);
    setSidebarCollapsed(localStorage.getItem("wp-sidebar-collapsed") === "1");
  }, [pathname]);

  // Scroll restoration
  useLayoutEffect(() => {
    const restoreScroll = (element: HTMLDivElement | null, storageKey: string) => {
      if (!element) return;
      const savedPosition = Number(sessionStorage.getItem(storageKey));
      if (Number.isFinite(savedPosition) && savedPosition >= 0) {
        element.scrollTop = savedPosition;
      }
    };

    restoringNavScrollRef.current = true;
    restoreScroll(desktopNavRef.current, DESKTOP_NAV_SCROLL_KEY);
    restoreScroll(mobileNavRef.current, MOBILE_NAV_SCROLL_KEY);

    const frame = requestAnimationFrame(() => {
      restoreScroll(desktopNavRef.current, DESKTOP_NAV_SCROLL_KEY);
      restoreScroll(mobileNavRef.current, MOBILE_NAV_SCROLL_KEY);
      restoringNavScrollRef.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, openSections, sidebarCollapsed, mobileMenuOpen]);

  const rememberNavScroll = (event: React.UIEvent<HTMLDivElement>, storageKey: string) => {
    if (restoringNavScrollRef.current) return;
    sessionStorage.setItem(storageKey, String(event.currentTarget.scrollTop));
  };

  // Load Notifications & Seat Count
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await notificationsApi.getAll();
        const items = unwrapList<NotificationItem>(res);
        setNotifications(items);
        setUnreadCount(
          typeof res?.unreadCount === "number"
            ? res.unreadCount
            : items.filter((n) => !n.isRead).length
        );
      } catch {
        // ignore
      }
    }
    async function loadSeatCount() {
      try {
        const res = await employeesApi.list({ page: 1, limit: 1 });
        const total = Number(res?.total ?? res?.data?.total);
        if (Number.isFinite(total)) setSeatCount(total);
      } catch {
        // ignore
      }
    }
    loadNotifications();
    loadSeatCount();
  }, []);

  const visibleSections = (isPlatformOwner ? PLATFORM_SECTIONS : NAV_SECTIONS).map((section) => ({
    ...section,
    items: section.items.filter((item) => itemVisible(item, role, user?.features) && itemMatches(item, navQuery)),
  })).filter((section) => section.items.length > 0);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem("wp-nav-open", JSON.stringify(next));
      return next;
    });
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const isCheckedIn = Boolean(
    todayStatus?.hasCheckedIn || todayStatus?.attendance?.checkIn
  ) && !Boolean(todayStatus?.hasCheckedOut || todayStatus?.attendance?.checkOut);
  const isOnBreak = todayStatus?.isOnBreak;

  const orgName = user?.organization?.name || "WorkPulse";
  const planName = isPlatformOwner ? "Platform owner" : user?.organization?.subscriptionPlan || "Standard Plan";
  const maxEmps = user?.features?.maxEmployees || user?.organization?.maxEmployees || 10;
  const countedSeats = Number(
    (user?.organization as any)?._count?.employees ??
    (user?.organization as any)?.employeeCount ??
    seatCount ??
    NaN
  );
  const hasSeatCount = Number.isFinite(countedSeats);
  const activeEmps = hasSeatCount ? countedSeats : 0;
  const empRatio = hasSeatCount ? Math.min(Math.round((activeEmps / (maxEmps || 1)) * 100), 100) : 0;

  const displayName = user?.employee?.firstName
    ? `${user.employee.firstName} ${user.employee.lastName || ""}`.trim()
    : user?.email?.split("@")[0] || "User";

  const userRoleDisplay = role ? role.replace("_", " ") : "ADMIN";

  // Breadcrumbs calculation
  const currentSection = NAV_SECTIONS.find((sec) =>
    sec.items.some((item) => isNavActive(pathname, item.href))
  );
  const currentItem = currentSection?.items.find((item) =>
    isNavActive(pathname, item.href)
  );

  const filteredNotifications = notifications.filter((n) => {
    if (notificationFilter === "UNREAD") return !n.isRead;
    return true;
  });

  return (
    <div className="wp-app-shell fixed inset-0 w-full h-full bg-slate-50 text-slate-900 flex overflow-hidden antialiased font-sans">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. Sleek Modern Enterprise Left Sidebar
      ───────────────────────────────────────────────────────────────────────────── */}
      <aside
        className={`wp-sidebar hidden lg:flex flex-col ${
          sidebarCollapsed ? "w-[76px]" : "w-[276px]"
        } shrink-0 h-full z-30 select-none transition-[width] duration-200 relative`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 ${
            sidebarCollapsed ? "px-3 justify-center" : "px-4"
          } flex items-center justify-between border-b border-white/[0.08] shrink-0 bg-white/[0.02]`}
        >
          <Brand
            href="/dashboard"
            inverse
            compact={sidebarCollapsed}
            subtitle={sidebarCollapsed ? undefined : "Enterprise"}
            className="min-w-0"
          />

          {!sidebarCollapsed && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="px-1.5 py-0.5 rounded-md text-xs font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
                title="Collapse menu (Ctrl+B)"
                aria-label="Collapse menu"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Workspace Switcher / Active Organization Card */}
        <div className={sidebarCollapsed ? "px-2 pt-3" : "px-3 pt-3"}>
          <Link
            href="/settings"
            title={`${orgName} (${planName})`}
            className={`wp-workspace-switcher group ${
              sidebarCollapsed ? "justify-center p-2" : "px-3 py-2"
            }`}
          >
            <CompanyLogo
              name={orgName}
              logoUrl={user?.organization?.logoUrl}
              size="sm"
              fallbackIcon
              className="!h-11 !w-11 !rounded-2xl ring-1 ring-white/15 shadow-lg shadow-indigo-950/30"
            />
            {!sidebarCollapsed && (
              <span className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-1.5">
                  <span className="block truncate text-xs font-bold text-white group-hover:text-indigo-200 transition">
                    {orgName}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_#34d399]" />
                </span>
                <span className="block text-xs text-white/50 font-medium truncate uppercase tracking-wider">
                  {planName.replace(/_/g, " ")}
                </span>
              </span>
            )}
            {!sidebarCollapsed && (
              <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </Link>
        </div>

        {/* Expand toggle when collapsed */}
        {sidebarCollapsed && (
          <div className="flex justify-center pt-2">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
              title="Expand menu (Ctrl+B)"
              aria-label="Expand menu"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Filter Search in Sidebar */}
        {!sidebarCollapsed && (
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="wp-sidebar-filter-input"
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="Filter pages (press /)"
                aria-label="Filter menu"
                className="wp-sidebar-search w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-400/80 focus:bg-white/[0.08]"
              />
              {navQuery ? (
                <button
                  onClick={() => setNavQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 bg-white/[0.05] px-1 py-0.5 rounded border border-white/[0.1]">
                  /
                </kbd>
              )}
            </div>
            {navQuery.trim() && (
              <p className="text-xs text-indigo-300 mt-1 px-1">
                Found {visibleSections.reduce((acc, s) => acc + s.items.length, 0)} matching items
              </p>
            )}
          </div>
        )}

        {/* Navigation Section List */}
        <div
          ref={desktopNavRef}
          onScroll={(event) => rememberNavScroll(event, DESKTOP_NAV_SCROLL_KEY)}
          className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800"
        >
          {visibleSections.map((section) => {
            const filtering = navQuery.trim().length > 0;
            const isOpen = filtering || sidebarCollapsed || openSections.includes(section.id);
            const activeCount = section.items.filter((item) => isNavActive(pathname, item.href)).length;

            return (
              <div key={section.id} className="space-y-1">
                {!sidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => !filtering && toggleSection(section.id)}
                    className="wp-nav-section w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${section.dot}`}
                      style={{ boxShadow: `0 0 8px ${section.glow}` }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold uppercase tracking-[0.14em] text-white/60">
                        {section.title}
                      </span>
                    </span>

                    {/* Section Count or Active Pill */}
                    {activeCount > 0 && !isOpen && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" />
                    )}

                    <span className="text-xs text-white/40 font-mono tabular-nums">
                      {section.items.length}
                    </span>

                    {!filtering && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>
                )}

                {sidebarCollapsed && (
                  <div className="mx-2 my-1.5 h-px bg-white/[0.08]" />
                )}

                {isOpen && (
                  <div className={`${sidebarCollapsed ? "space-y-1.5" : "space-y-0.5 pl-1"}`}>
                    {section.items.map((item) => {
                      const isActive = isNavActive(pathname, item.href);
                      const Icon = item.icon;

                      return (
                        <div key={item.href} className="relative group">
                          <Link
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            className={`wp-nav-link flex items-center ${
                              sidebarCollapsed ? "justify-center px-0 py-1.5" : "gap-2.5 px-2.5 py-1.5"
                            } rounded-xl text-[13px] font-medium transition-all ${
                              isActive
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                : "text-slate-300/80 hover:text-white hover:bg-white/[0.06]"
                            }`}
                          >
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                                isActive
                                  ? "bg-white/20 text-white shadow-inner"
                                  : "bg-white/[0.04] text-slate-400 group-hover:text-white group-hover:bg-white/[0.08]"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>

                            {!sidebarCollapsed && (
                              <>
                                <span className="truncate flex-1">{item.label}</span>
                                {item.badge && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
                                      item.badgeColor || "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                    }`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </>
                            )}
                          </Link>

                          {/* Floating Tooltip when Sidebar is Collapsed */}
                          {sidebarCollapsed && (
                            <div className="wp-tooltip-flyout">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">{item.label}</span>
                                {item.badge && (
                                  <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 max-w-[180px] truncate mt-0.5">
                                {item.hint}
                              </p>
                              <span className="text-xs text-indigo-400 block mt-1 uppercase tracking-wider font-semibold">
                                {section.title}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {visibleSections.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-slate-400">
              <p>No navigation pages match &ldquo;{navQuery}&rdquo;</p>
              <button
                onClick={() => setNavQuery("")}
                className="mt-2 text-indigo-400 hover:text-indigo-300 underline font-semibold"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Quick Actions & Support */}
        <div className={`wp-sidebar-footer ${sidebarCollapsed ? "p-2" : "p-3"} pt-2 border-t border-white/[0.06]`}>

          {/* Quick Action links in Footer */}
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between px-1 text-xs text-slate-400">
              <button
                onClick={() => setShortcutsModalOpen(true)}
                className="flex items-center gap-1.5 hover:text-white transition cursor-pointer"
              >
                <Command className="w-3 h-3 text-indigo-400" />
                <span>Shortcuts</span>
              </button>
              <Link
                href="/settings"
                className="flex items-center gap-1.5 hover:text-white transition"
              >
                <HelpCircle className="w-3 h-3 text-indigo-400" />
                <span>Help & Docs</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 pt-1">
              <button
                onClick={() => setShortcutsModalOpen(true)}
                title="Keyboard Shortcuts (?)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
              >
                <Command className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. Right Main Application Shell (Header + Breadcrumb + Canvas)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-visible">
        {/* Top Header Bar */}
        <header className="wp-topbar relative h-16 shrink-0 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 z-50">
          {/* Left: Mobile Toggle & Breadcrumb Navigator */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition shrink-0 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs Trail */}
            <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500 overflow-hidden" aria-label="Breadcrumb">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 hover:text-slate-900 transition shrink-0 font-semibold"
              >
                <Home className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">WorkPulse</span>
              </Link>

              {currentSection && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="hidden md:flex items-center gap-1.5 text-slate-600 font-medium shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${currentSection.dot}`} />
                    {currentSection.title}
                  </span>
                </>
              )}

              {currentItem && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="flex items-center gap-1.5 text-slate-900 font-bold truncate">
                    <span>{currentItem.label}</span>
                  </span>
                </>
              )}
            </nav>
          </div>

          {/* Center/Right: Interactive Command Search Launcher */}
          <div className="flex-1 max-w-xs md:max-w-sm lg:max-w-md hidden md:block">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 text-xs text-slate-500 transition cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition shrink-0" />
                <span className="truncate">Search pages, actions, or jump...</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded shadow-2xs">
                  Ctrl K
                </kbd>
              </div>
            </button>
          </div>

          {/* Right: Quick Punch Executive Pill, Notifications, Chat & User Menu */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {!isPlatformOwner && (
            <>
            {/* Quick Punch Widget */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/90 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCheckedIn
                      ? isOnBreak
                        ? "bg-amber-500 animate-pulse ring-4 ring-amber-500/20"
                        : "bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20"
                      : "bg-slate-400"
                  }`}
                />
                <span className="font-semibold text-slate-800 text-xs">
                  {isCheckedIn ? (isOnBreak ? "On Break" : "Clocked In") : "Clocked Out"}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className={`w-3 h-3 ${isWithinGeofence ? "text-emerald-600" : "text-amber-500"}`} />
                  {isWithinGeofence ? "In Zone" : "Remote"}
                </span>
              </div>

              {!isCheckedIn ? (
                <button
                  onClick={() => setPendingPunch("CHECK_IN")}
                  disabled={isActionLoading}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-2xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Clock in with geolocation"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Clock In
                </button>
              ) : isOnBreak ? (
                <button
                  onClick={endBreak}
                  disabled={isActionLoading}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-2xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  End Break
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={startBreak}
                    disabled={isActionLoading}
                    className="p-1 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition cursor-pointer disabled:opacity-50"
                    title="Take a short coffee break"
                  >
                    <Coffee className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPendingPunch("CHECK_OUT")}
                    disabled={isActionLoading}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-2xs transition cursor-pointer disabled:opacity-50"
                    title="Clock out"
                  >
                    Clock Out
                  </button>
                </div>
              )}
            </div>

            </>
            )}
            {/* Mobile Search Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Open search palette"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notifications Bell with Popover */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition relative cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 ? (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                ) : null}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 z-50 text-slate-800"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                            {unreadCount} unread
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={() => setNotificationsOpen(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex items-center gap-1 pb-2 text-xs">
                      <button
                        onClick={() => setNotificationFilter("ALL")}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          notificationFilter === "ALL"
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setNotificationFilter("UNREAD")}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          notificationFilter === "UNREAD"
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Unread only
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2 text-xs">
                      {filteredNotifications.length === 0 ? (
                        <div className="py-8 text-center text-slate-400">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                          <p className="font-semibold text-slate-600">All caught up!</p>
                          <p className="text-xs">No notifications to show right now.</p>
                        </div>
                      ) : (
                        filteredNotifications.slice(0, 8).map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 rounded-xl transition border ${
                              n.isRead
                                ? "bg-slate-50/70 border-slate-100 text-slate-600"
                                : "bg-indigo-50/50 border-indigo-100 text-slate-900 font-medium"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-bold text-slate-900">{n.title}</span>
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-slate-600 text-xs leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Direct Team Chat shortcut */}
            <Link
              href="/chat"
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition relative"
              title="Team Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </Link>

            {/* Keyboard Shortcuts Trigger Button */}
            <button
              onClick={() => setShortcutsModalOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer hidden sm:block"
              title="Keyboard Shortcuts (?)"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200" />

            {/* User Profile Pill with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition text-left cursor-pointer"
              >
                <div className="relative">
                  {user?.avatarUrl || user?.employee?.avatarUrl ? (
                    <img
                      src={user.avatarUrl || user.employee?.avatarUrl}
                      alt={displayName}
                      className="w-8 h-8 rounded-full object-cover shadow-xs ring-2 ring-indigo-100"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center uppercase shadow-xs ring-2 ring-indigo-100">
                      {displayName[0] || "U"}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>

                <div className="hidden xl:block leading-tight">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">{displayName}</p>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">{userRoleDisplay}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
              </button>

              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-[min(20rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-[1.35rem] border border-slate-200/90 bg-white p-2 text-slate-800 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.45)] ring-1 ring-white/80 z-[70] origin-top-right"
                  >
                    <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900">{displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {userRoleDisplay}
                        </span>
                        <span className="text-xs text-slate-400 truncate">
                          {orgName}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <Link
                        href="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        <FileCheck2 className="w-4 h-4 text-slate-400" />
                        <span>My Profile & Documents</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>Organization & Billing</span>
                      </Link>
                      <Link
                        href="/chat"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span>Team Chat</span>
                      </Link>
                    </div>

                    <div className="h-px bg-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
              className="wp-mobile-drawer lg:hidden fixed inset-0 z-50 bg-slate-950 text-slate-200 p-5 flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <Brand href="/dashboard" inverse subtitle="Enterprise" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-white/[0.08] text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!isPlatformOwner && (
              <>
              {/* Mobile Quick Punch Bar */}
              <div className="mt-3 p-3 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isCheckedIn
                        ? isOnBreak
                          ? "bg-amber-400 animate-pulse"
                          : "bg-emerald-400 animate-pulse"
                        : "bg-slate-400"
                    }`}
                  />
                  <span className="text-xs font-bold text-white">
                    {isCheckedIn ? (isOnBreak ? "On Break" : "Clocked In") : "Clocked Out"}
                  </span>
                </div>
                {!isCheckedIn ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setPendingPunch("CHECK_IN");
                    }}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 text-white"
                  >
                    Clock In
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setPendingPunch("CHECK_OUT");
                    }}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-600 text-white"
                  >
                    Clock Out
                  </button>
                )}
              </div>

              </>
              )}
              {/* Mobile Navigation Search */}
              <div className="pt-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={navQuery}
                    onChange={(e) => setNavQuery(e.target.value)}
                    placeholder="Find a page"
                    aria-label="Filter menu"
                    className="wp-sidebar-search w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              {/* Mobile Navigation Sections */}
              <div
                ref={mobileNavRef}
                onScroll={(event) => rememberNavScroll(event, MOBILE_NAV_SCROLL_KEY)}
                className="flex-1 overflow-y-auto py-4 space-y-3"
              >
                {visibleSections.map((section) => {
                  const filtering = navQuery.trim().length > 0;
                  const isOpen = filtering || openSections.includes(section.id);
                  return (
                    <div key={section.id}>
                      <button
                        type="button"
                        onClick={() => !filtering && toggleSection(section.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${section.dot}`} />
                        <span className="flex-1 text-xs font-bold uppercase tracking-[0.14em] text-white/60">
                          {section.title}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-white/40 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isOpen &&
                        section.items.map((item) => {
                          const isActive = isNavActive(pathname, item.href);
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              aria-current={isActive ? "page" : undefined}
                              className={`wp-nav-link flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                                isActive
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                  : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                              }`}
                            >
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  isActive ? "bg-white/20 text-white" : "bg-white/[0.05] text-slate-400"
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </span>
                              <span className="truncate flex-1">{item.label}</span>
                              {item.badge && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-white/10 text-white">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                    </div>
                  );
                })}
              </div>

              {/* Mobile Drawer Footer */}
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{displayName}</p>
                  <p className="text-xs text-indigo-400 font-semibold uppercase">{userRoleDisplay}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Application Canvas */}
        <main className="wp-main-canvas min-w-0 flex-1 h-full overflow-y-auto p-3 sm:p-6 lg:p-8 bg-slate-50 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="min-h-full"
          >
            <SubscriptionBanner />
            {children}
          </motion.div>
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onPunchIn={() => setPendingPunch("CHECK_IN")}
        onPunchOut={() => setPendingPunch("CHECK_OUT")}
        onBreak={isOnBreak ? endBreak : startBreak}
        isCheckedIn={isCheckedIn}
        isOnBreak={isOnBreak}
        role={role}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <ShortcutsHelpModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
        onOpenCommandPalette={() => {
          setShortcutsModalOpen(false);
          setCommandPaletteOpen(true);
        }}
        onToggleSidebar={toggleSidebar}
      />

      {/* Punch Confirmation Modal */}
      <PunchConfirmDialog
        action={pendingPunch}
        loading={isActionLoading}
        locationLabel={locationLabel}
        onCancel={() => setPendingPunch(null)}
        onConfirm={async (options) => {
          const ok = pendingPunch === "CHECK_OUT" ? await checkOut() : await checkIn(options);
          if (ok) setPendingPunch(null);
        }}
      />
    </div>
  );
}
