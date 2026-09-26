"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  LogOut,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { employeesApi, notificationsApi } from "@/lib/api";
import { NotificationItem } from "@/types";
import { unwrapList } from "@/lib/utils";
import PunchConfirmDialog, { PunchConfirmAction } from "@/components/attendance/PunchConfirmDialog";
import { SubscriptionBanner } from "@/components/billing/WorkspaceBilling";

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
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: "my-work",
    title: "My Work",
    blurb: "What you use every day",
    dot: "bg-indigo-400",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, hint: "Today’s attendance, approvals, and payroll", keywords: ["home", "overview"] },
      { label: "Attendance", href: "/attendance", icon: Clock, hint: "Clock in, history, and punch status", keywords: ["punch", "clock", "timesheet"] },
      { label: "Leaves", href: "/leaves", icon: CalendarDays, hint: "Apply, balance, and leave calendar", keywords: ["leave", "vacation", "time off"] },
      { label: "Chat", href: "/chat", icon: MessageSquare, hint: "Messages with your team", keywords: ["message", "inbox"] },
      { label: "Profile", href: "/profile", icon: CircleUser, hint: "Your details and documents", keywords: ["me", "account", "docs"] },
    ],
  },
  {
    id: "pay",
    title: "Pay & Benefits",
    blurb: "Salary, claims, and growth",
    dot: "bg-emerald-400",
    items: [
      { label: "Payroll", href: "/payroll", icon: Receipt, hint: "Payslips, runs, and salary", keywords: ["salary", "payslip", "pay"], feature: "hasPayroll" },
      { label: "Loans", href: "/loans", icon: HandCoins, hint: "Advances and repayment", keywords: ["advance", "loan"] },
      { label: "Statutory", href: "/statutory", icon: Landmark, hint: "PF, ESI, and compliance", keywords: ["pf", "esi", "tax", "compliance"], feature: "hasPayroll" },
      { label: "Expenses", href: "/expenses", icon: CreditCard, hint: "Claims and reimbursements", keywords: ["claim", "reimburse"] },
      { label: "Overtime", href: "/overtime", icon: Layers, hint: "Extra hours and comp-off", keywords: ["ot", "comp off"] },
      { label: "Appraisals", href: "/appraisals", icon: Award, hint: "Reviews and ratings", keywords: ["review", "performance"] },
    ],
  },
  {
    id: "people",
    title: "People",
    blurb: "Team, hiring, and exits",
    dot: "bg-violet-400",
    items: [
      { label: "Approvals", href: "/approvals", icon: ShieldCheck, hint: "Leave, shift, and request inbox", keywords: ["inbox", "requests"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
      { label: "People", href: "/employees", icon: Users, hint: "Employee directory", keywords: ["employee", "staff", "directory"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
      { label: "Departments", href: "/departments", icon: FolderTree, hint: "Teams and org structure", keywords: ["team", "org"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
      { label: "Onboarding", href: "/onboarding", icon: UserPlus, hint: "New joiner checklists", keywords: ["hire", "joining"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
      { label: "Offboarding", href: "/offboarding", icon: UserMinus, hint: "Exits and clearance", keywords: ["exit", "resign"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
    ],
  },
  {
    id: "workplace",
    title: "Workplace",
    blurb: "How the company runs",
    dot: "bg-amber-400",
    items: [
      { label: "Shifts", href: "/shifts", icon: CalendarRange, hint: "Rosters and shift patterns", keywords: ["roster", "schedule"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
      { label: "Branches", href: "/branches", icon: MapPin, hint: "Add location and assign people", keywords: ["office", "location", "geo"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
      { label: "Holidays", href: "/holidays", icon: Calendar, hint: "Company holiday calendar", keywords: ["holiday"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
      { label: "Policy", href: "/policy", icon: SlidersHorizontal, hint: "Attendance and leave rules", keywords: ["rules", "settings"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
      { label: "Assets", href: "/assets", icon: Laptop, hint: "Laptops and assigned gear", keywords: ["laptop", "device", "inventory"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
    ],
  },
  {
    id: "insights",
    title: "Insights",
    blurb: "Reports and workspace admin",
    dot: "bg-sky-400",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3, hint: "Attendance and payroll reports", keywords: ["analytics", "export"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
      { label: "Settings", href: "/settings", icon: Settings, hint: "Plan, company, and preferences", keywords: ["plan", "billing", "company"], roles: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
    ],
  },
];

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
  const router = useRouter();
  const { user, role, logout } = useAuth();
  const { todayStatus, checkIn, checkOut, startBreak, endBreak, isActionLoading, isWithinGeofence, locationLabel } = useAttendance();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingPunch, setPendingPunch] = useState<PunchConfirmAction | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(["my-work"]);
  const [seatCount, setSeatCount] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

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

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!searchBoxRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, []);

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

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => itemVisible(item, role, user?.features) && itemMatches(item, navQuery)),
  })).filter((section) => section.items.length > 0);

  const searchResults = NAV_SECTIONS.flatMap((section) =>
    section.items
      .filter((item) => itemVisible(item, role, user?.features) && itemMatches(item, searchQuery))
      .map((item) => ({ ...item, section: section.title }))
  ).slice(0, 8);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem("wp-nav-open", JSON.stringify(next));
      return next;
    });
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem("wp-sidebar-collapsed", prev ? "0" : "1");
      return !prev;
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
  const planName = user?.organization?.subscriptionPlan || "Standard Plan";
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

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const match = searchResults[0];
    if (match) {
      setSearchOpen(false);
      setSearchQuery("");
      router.push(match.href);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#f8fafc] text-slate-900 flex overflow-hidden antialiased">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. Sleek Dark Navy Left Sidebar
      ───────────────────────────────────────────────────────────────────────────── */}
      <aside className={`hidden lg:flex flex-col ${sidebarCollapsed ? "w-[76px]" : "w-[268px]"} bg-[#0f172a] text-slate-300 shrink-0 h-full border-r border-white/5 z-30 select-none transition-[width] duration-200`}>
        {/* Brand Header */}
        <div className={`h-16 ${sidebarCollapsed ? "px-3 justify-center" : "px-4"} flex items-center gap-2 border-b border-white/10 shrink-0`}>
          <Brand
            href="/dashboard"
            inverse
            compact={sidebarCollapsed}
            subtitle={sidebarCollapsed ? undefined : "Workspace"}
            className="min-w-0"
          />

          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              title="Collapse menu"
              aria-label="Collapse menu"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="mx-auto mt-3 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Expand menu"
            aria-label="Expand menu"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {!sidebarCollapsed && (
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="Find a page"
                aria-label="Filter menu"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-400/60 focus:bg-white/[0.06]"
              />
            </div>
          </div>
        )}

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
          {visibleSections.map((section) => {
            const filtering = navQuery.trim().length > 0;
            const isOpen = filtering || sidebarCollapsed || openSections.includes(section.id);

            return (
              <div key={section.id}>
                {!sidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => !filtering && toggleSection(section.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/[0.04] transition"
                    aria-expanded={isOpen}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${section.dot}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">{section.title}</span>
                      {isOpen && <span className="block text-[10px] text-white/35 font-medium normal-case tracking-normal">{section.blurb}</span>}
                    </span>
                    <span className="text-[10px] text-slate-500 tabular-nums">{section.items.length}</span>
                    {!filtering && (
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    )}
                  </button>
                )}
                {sidebarCollapsed && <div className="mx-2 mb-1 h-px bg-white/10" />}
                {isOpen && (
                  <div className={`${sidebarCollapsed ? "space-y-1" : "mt-1 space-y-0.5"}`}>
                    {section.items.map((item) => {
                      const isActive = isNavActive(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={sidebarCollapsed ? item.label : item.hint}
                          className={`group flex items-center ${sidebarCollapsed ? "justify-center px-0 py-1.5" : "gap-2.5 px-2 py-1.5"} rounded-xl text-[13px] font-medium transition-colors ${
                            isActive
                              ? "bg-indigo-600 text-white shadow-lg shadow-black/30"
                              : "text-white/55 hover:text-white hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-white/15 text-white" : "bg-white/[0.04] text-slate-400 group-hover:text-slate-200"}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          {!sidebarCollapsed && (
                            <>
                              <span className="truncate">{item.label}</span>
                              {item.badge && (
                                <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || "bg-indigo-500 text-white"}`}>
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {visibleSections.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-slate-500">No pages match that search.</p>
          )}
        </div>

        {/* Sidebar Footer: Organization Plan Meter */}
        <div className={`${sidebarCollapsed ? "p-2" : "p-3"} border-t border-white/10 bg-black/25 space-y-2.5`}>
          <Link
            href="/settings"
            title={orgName}
            className={`block rounded-xl bg-white/[0.04] border border-white/10 hover:border-indigo-400/50 transition group ${sidebarCollapsed ? "p-2" : "p-3"}`}
          >
            <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} mb-1.5`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                {!sidebarCollapsed && (
                  <div className="leading-tight min-w-0">
                    <p className="text-xs font-semibold text-white truncate max-w-[140px]">{orgName}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span className="truncate">{planName}</span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                      <span className="text-emerald-400 shrink-0">Active</span>
                    </p>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
              )}
            </div>

            {!sidebarCollapsed && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-medium">
                  <span>{hasSeatCount ? activeEmps : "—"} / {maxEmps} employees</span>
                  <span>{hasSeatCount ? `${empRatio}%` : ""}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${empRatio}%` }}
                  />
                </div>
              </div>
            )}
          </Link>

          <Link
            href="/settings"
            title="Need help"
            className={`flex items-center ${sidebarCollapsed ? "justify-center py-1" : "justify-between px-2 py-1"} text-[11px] text-slate-400 hover:text-slate-200 transition`}
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              {!sidebarCollapsed && <span>Need Help? We&apos;re here</span>}
            </div>
            {!sidebarCollapsed && <ChevronRight className="w-3 h-3 text-slate-500" />}
          </Link>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. Right Main Application Shell (Header + Scrollable Body)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 bg-[#ffffff]/90 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 z-20">
          {/* Left: Mobile Menu Toggle & Full-width Search Bar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition shrink-0"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Modern Search Input with Ctrl+K Badge */}
            <div ref={searchBoxRef} className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
              <form onSubmit={handleSearchSubmit}>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Jump to a page..."
                  aria-label="Jump to a page"
                  className="w-full pl-9 sm:pl-10 pr-14 sm:pr-20 py-2 text-xs rounded-xl bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none text-slate-800 placeholder-slate-400"
                />
              </form>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center pointer-events-none">
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
                  Ctrl K
                </kbd>
              </div>
              {searchOpen && searchQuery.trim() && (
                <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden">
                  {searchResults.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-slate-500 text-center">No pages match.</p>
                  ) : (
                    searchResults.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                            router.push(item.href);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition"
                        >
                          <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-slate-800">{item.label}</span>
                            <span className="block text-[11px] text-slate-500 truncate">{item.section} · {item.hint}</span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick Punch, Notification, Messages, Help & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
            {/* Quick Header Punch Widget */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                <MapPin className={`w-3.5 h-3.5 ${isWithinGeofence ? "text-emerald-500" : "text-amber-500"}`} />
                <span className="font-mono text-[11px] font-semibold">
                  {isCheckedIn ? (isOnBreak ? "On Break" : "Clocked In") : "Clocked Out"}
                </span>
              </div>

              {!isCheckedIn ? (
                <button
                  onClick={() => setPendingPunch("CHECK_IN")}
                  disabled={isActionLoading}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Clock in from any location"
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
                    className="px-2 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer disabled:opacity-50"
                    title="Take a short break"
                  >
                    <Coffee className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPendingPunch("CHECK_OUT")}
                    disabled={isActionLoading}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-2xs transition cursor-pointer disabled:opacity-50"
                    title="Clock out from any location"
                  >
                    Clock Out
                  </button>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 ? (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                ) : (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </button>

              {/* Notification Drawer */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute right-0 sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 z-50 text-slate-800"
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2">
                      <span className="font-semibold text-xs text-slate-900">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-1.5">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center">No notifications at the moment</p>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl text-xs transition border ${
                              n.isRead
                                ? "bg-slate-50/70 border-slate-100 text-slate-600"
                                : "bg-indigo-50/60 border-indigo-100 text-slate-800"
                            }`}
                          >
                            <div className="font-semibold text-slate-900 mb-0.5">{n.title}</div>
                            <div className="text-slate-600 text-[11px] leading-relaxed">{n.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => router.push("/chat")}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Team chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Help Question Circle Icon */}
            <button
              onClick={() => router.push(["SUPER_ADMIN", "COMPANY_ADMIN"].includes(role || "") ? "/settings" : "/profile")}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Help & Documentation"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200 mx-0.5" />

            {/* User Profile Pill with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition text-left"
              >
                {user?.avatarUrl || user?.employee?.avatarUrl ? (
                  <img
                    src={user.avatarUrl || user.employee?.avatarUrl}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover shadow-sm ring-2 ring-blue-100"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center uppercase shadow-sm ring-2 ring-blue-100">
                    {displayName[0] || "S"}
                  </div>
                )}
                <div className="hidden xl:block leading-tight">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">{displayName}</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{userRoleDisplay}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
              </button>

              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 text-slate-800"
                  >
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900">{displayName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-100 transition"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>My Profile & Docs</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-100 transition"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-500" />
                      <span>Settings & Plan</span>
                    </Link>
                    <div className="h-px bg-slate-100 my-1" />
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
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
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="lg:hidden fixed inset-0 z-50 bg-[#0f172a] text-slate-300 p-5 flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <Brand href="/dashboard" inverse subtitle="Workspace" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="pt-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={navQuery}
                    onChange={(e) => setNavQuery(e.target.value)}
                    placeholder="Find a page"
                    aria-label="Filter menu"
                    className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
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
                        <span className="flex-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{section.title}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && section.items.map((item) => {
                        const isActive = isNavActive(pathname, item.href);
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-[13px] font-medium ${
                              isActive ? "bg-indigo-600 text-white" : "text-slate-400"
                            }`}
                          >
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? "bg-white/15" : "bg-white/[0.04]"}`}>
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">{displayName}</p>
                  <p className="text-[10px] text-slate-400">{userRoleDisplay}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Scrollable Canvas */}
        <main className="flex-1 h-full overflow-y-auto p-3 sm:p-6 lg:p-8 bg-[#f8fafc] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="min-h-full"
          >
            <SubscriptionBanner />
            {children}
          </motion.div>
        </main>
      </div>

      <PunchConfirmDialog
        action={pendingPunch}
        loading={isActionLoading}
        locationLabel={locationLabel}
        onCancel={() => setPendingPunch(null)}
        onConfirm={async () => {
          const ok = pendingPunch === "CHECK_OUT" ? await checkOut() : await checkIn();
          if (ok) setPendingPunch(null);
        }}
      />
    </div>
  );
}
