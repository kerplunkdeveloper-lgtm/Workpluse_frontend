"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Clock,
  CalendarDays,
  Receipt,
  Users,
  CalendarRange,
  Calendar,
  SlidersHorizontal,
  UserPlus,
  BarChart3,
  Settings,
  ShieldCheck,
  KeyRound,
  MapPin,
  Coffee,
  CheckCircle2,
  Layers,
  UserMinus,
  Laptop,
  FolderTree,
  MessageSquare,
  Landmark,
  HandCoins,
  CreditCard,
  Building2,
  History,
  Award,
  CircleUser,
  CornerDownLeft,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface CommandItem {
  id: string;
  label: string;
  category: "Workspace" | "Team & Payroll" | "People Operations" | "Workplace" | "Insights & Admin" | "Quick Action" | "Platform";
  hint: string;
  href?: string;
  action?: () => void;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onPunchIn?: () => void;
  onPunchOut?: () => void;
  onBreak?: () => void;
  isCheckedIn?: boolean;
  isOnBreak?: boolean;
  role?: string | null;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Workspace": { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  "Team & Payroll": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "People Operations": { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  "Workplace": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  "Insights & Admin": { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  "Quick Action": { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  Platform: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

export default function CommandPalette({
  isOpen,
  onClose,
  onPunchIn,
  onPunchOut,
  onBreak,
  isCheckedIn,
  isOnBreak,
  role,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = JSON.parse(localStorage.getItem("wp-command-recents") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const saveRecent = (id: string) => {
    try {
      const next = [id, ...recentIds.filter((item) => item !== id)].slice(0, 5);
      setRecentIds(next);
      localStorage.setItem("wp-command-recents", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const allCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // Quick Actions
      {
        id: "action-punch-in",
        label: isCheckedIn ? "Clock In (Already Active)" : "Clock In Now",
        category: "Quick Action",
        hint: "Record start of day with geolocation timestamp",
        icon: CheckCircle2,
        badge: "Action",
        badgeColor: "bg-emerald-100 text-emerald-800",
        action: onPunchIn,
        keywords: ["punch in", "clock in", "start work"],
      },
      {
        id: "action-punch-out",
        label: "Clock Out Now",
        category: "Quick Action",
        hint: "Record end of shift and log daily work duration",
        icon: Clock,
        badge: "Action",
        badgeColor: "bg-rose-100 text-rose-800",
        action: onPunchOut,
        keywords: ["punch out", "clock out", "end shift"],
      },
      {
        id: "action-break",
        label: isOnBreak ? "End Current Break" : "Take a Quick Break",
        category: "Quick Action",
        hint: "Pause or resume attendance tracking",
        icon: Coffee,
        badge: "Action",
        badgeColor: "bg-amber-100 text-amber-800",
        action: onBreak,
        keywords: ["coffee", "tea", "lunch", "break", "pause"],
      },

      // Workspace
      { id: "nav-dashboard", label: "Dashboard", category: "Workspace", hint: "Executive summary, KPIs, and live attendance metrics", href: "/dashboard", icon: LayoutDashboard, keywords: ["home", "kpi", "overview"] },
      { id: "nav-attendance", label: "Attendance & Punches", category: "Workspace", hint: "Punch clock, geolocation logs, timesheets", href: "/attendance", icon: Clock, keywords: ["clock", "punch", "timesheet", "history"] },
      { id: "nav-leaves", label: "Leaves & Time Off", category: "Workspace", hint: "Apply for leaves, view balances, upcoming holidays", href: "/leaves", icon: CalendarDays, keywords: ["vacation", "sick", "casual", "time off"] },
      { id: "nav-chat", label: "Team Messages & Chat", category: "Workspace", hint: "Internal workplace messaging and announcements", href: "/chat", icon: MessageSquare, keywords: ["inbox", "message", "conversation"] },
      { id: "nav-profile", label: "My Profile & Documents", category: "Workspace", hint: "Personal data, bank accounts, identity proofs", href: "/profile", icon: CircleUser, keywords: ["account", "me", "kyc", "documents"] },

      // Team & Payroll
      { id: "nav-payroll", label: "Payroll Processing", category: "Team & Payroll", hint: "Monthly runs, salary structures, payslips generation", href: "/payroll", icon: Receipt, badge: "Auto", keywords: ["salary", "payslip", "wages", "pay"] },
      { id: "nav-loans", label: "Employee Advances & Loans", category: "Team & Payroll", hint: "Advance salary requests and EMI deduction schedules", href: "/loans", icon: HandCoins, keywords: ["advance", "emi", "borrow"] },
      { id: "nav-statutory", label: "Statutory & Tax Compliance", category: "Team & Payroll", hint: "PF, ESI, Professional Tax, TDS compliance registers", href: "/statutory", icon: Landmark, keywords: ["pf", "esi", "tax", "tds", "compliance"] },
      { id: "nav-expenses", label: "Expense Claims", category: "Team & Payroll", hint: "Reimbursements, receipt uploads, manager approvals", href: "/expenses", icon: CreditCard, keywords: ["claim", "reimbursement", "bills"] },
      { id: "nav-overtime", label: "Overtime & Comp-off", category: "Team & Payroll", hint: "Overtime hours calculations, approvals, and payout", href: "/overtime", icon: Layers, keywords: ["ot", "extra hours", "comp off"] },
      { id: "nav-appraisals", label: "Appraisals & Performance", category: "Team & Payroll", hint: "Performance reviews, KPI goals, ratings & promotions", href: "/appraisals", icon: Award, keywords: ["review", "kpi", "rating", "evaluation"] },

      // People Operations
      { id: "nav-approvals", label: "Approvals Inbox", category: "People Operations", hint: "Pending leave requests, shifts, expense clearances", href: "/approvals", icon: ShieldCheck, badge: "Inbox", keywords: ["requests", "inbox", "pending"] },
      { id: "nav-employees", label: "Employee Directory", category: "People Operations", hint: "Staff profiles, contact info, job designations", href: "/employees", icon: Users, keywords: ["staff", "team", "people", "directory"] },
      { id: "nav-departments", label: "Departments & Org Chart", category: "People Operations", hint: "Org structure, teams, reporting hierarchies", href: "/departments", icon: FolderTree, keywords: ["team", "org", "departments"] },
      { id: "nav-onboarding", label: "Employee Onboarding", category: "People Operations", hint: "New hire checklists, document verification workflows", href: "/onboarding", icon: UserPlus, keywords: ["joining", "hire", "welcome"] },
      { id: "nav-offboarding", label: "Employee Offboarding", category: "People Operations", hint: "Exit clearance, asset return, full & final settlement", href: "/offboarding", icon: UserMinus, keywords: ["resignation", "exit", "fnf"] },

      // Workplace
      { id: "nav-shifts", label: "Shift Planner & Rosters", category: "Workplace", hint: "Rotational shift schedules, weekly rosters, timings", href: "/shifts", icon: CalendarRange, keywords: ["roster", "schedule", "timing"] },
      { id: "nav-branches", label: "Offices & Branches", category: "Workplace", hint: "Geo-fencing coordinates, office addresses, Wi-Fi SSIDs", href: "/branches", icon: MapPin, keywords: ["location", "geofence", "office"] },
      { id: "nav-holidays", label: "Company Holiday Calendar", category: "Workplace", hint: "Official public and optional religious holiday schedule", href: "/holidays", icon: Calendar, keywords: ["holiday", "festival", "calendar"] },
      { id: "nav-policy", label: "Workplace Policies", category: "Workplace", hint: "Attendance grace periods, leave rules, deduction limits", href: "/policy", icon: SlidersHorizontal, keywords: ["rules", "grace", "late policy"] },
      { id: "nav-assets", label: "Company Asset Inventory", category: "Workplace", hint: "Assigned laptops, access cards, hardware tracking", href: "/assets", icon: Laptop, keywords: ["laptop", "hardware", "devices", "inventory"] },

      // Insights & Admin
      { id: "nav-reports", label: "Reports & PDF Muster Roll", category: "Insights & Admin", hint: "Daily attendance logs, monthly muster roll PDF exports", href: "/reports", icon: BarChart3, badge: "PDF", keywords: ["export", "excel", "csv", "analytics"] },
      { id: "nav-settings", label: "Workspace & Billing Settings", category: "Insights & Admin", hint: "Subscription plan, Razorpay invoices, company profile", href: "/settings", icon: Settings, keywords: ["plan", "billing", "invoice", "company", "license"] },
      { id: "nav-permissions", label: "Role Permissions & Security", category: "Insights & Admin", hint: "Custom access roles, granular feature permissions", href: "/permissions", icon: KeyRound, keywords: ["security", "roles", "access", "admin"] },
    ];

    // The platform owner gets platform commands only.
    if (role === "SUPER_ADMIN") {
      return [
        { id: "platform-clients", label: "Clients", category: "Platform", hint: "Every customer workspace, plan, seats and payments", href: "/platform/clients", icon: Building2, badge: "Owner", keywords: ["customers", "tenants", "revenue", "suspend", "trial"] },
        { id: "platform-activity", label: "Activity", category: "Platform", hint: "Every owner action on a client, with who and why", href: "/platform/activity", icon: History, keywords: ["audit", "log", "history", "suspend"] },
        { id: "platform-billing", label: "Pricing & offers", category: "Platform", hint: "Plan prices and discount codes", href: "/platform/billing", icon: CreditCard, keywords: ["pricing", "coupon", "offer", "plans"] },
      ];
    }

    return list;
  }, [isCheckedIn, isOnBreak, onPunchIn, onPunchOut, onBreak, role]);

  // Filter commands by search query and category
  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCommands.filter((cmd) => {
      if (activeCategory !== "ALL" && cmd.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      const matchLabel = cmd.label.toLowerCase().includes(q);
      const matchHint = cmd.hint.toLowerCase().includes(q);
      const matchCategory = cmd.category.toLowerCase().includes(q);
      const matchKeywords = cmd.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
      return matchLabel || matchHint || matchCategory || matchKeywords;
    });
  }, [allCommands, query, activeCategory]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const activeIndex = Math.min(selectedIndex, Math.max(0, filteredCommands.length - 1));

  const executeCommand = (cmd: CommandItem) => {
    saveRecent(cmd.id);
    onClose();
    if (cmd.action) {
      cmd.action();
    } else if (cmd.href) {
      router.push(cmd.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredCommands[activeIndex];
      if (current) executeCommand(current);
    }
  };

  const categories = role === "SUPER_ADMIN" ? ["ALL"] : ["ALL", "Workspace", "Team & Payroll", "People Operations", "Workplace", "Insights & Admin", "Quick Action"];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-2xl z-10 flex flex-col max-h-[82vh]"
            onKeyDown={handleKeyDown}
          >
            {/* Top Search Input Bar */}
            <div className="relative flex shrink-0 items-center border-b border-slate-100 px-4 py-3.5 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20">
              <Search className="w-5 h-5 text-indigo-600 shrink-0 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command, page name, or action (e.g. 'Punch In', 'Leaves', 'Payroll')..."
                className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition mr-2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs shrink-0">
                Esc
              </kbd>
            </div>

            {/* Filter Category Chips */}
            <div className="flex shrink-0 items-center gap-1 px-4 py-2.5 border-b border-slate-100 bg-slate-50 overflow-x-auto scrollbar-none text-xs">
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white"
                    }`}
                  >
                    {cat === "ALL" ? "All Items" : cat}
                  </button>
                );
              })}
            </div>

            {/* Command Results List */}
            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 space-y-1 divide-y divide-slate-50 text-xs">
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No matching commands or pages</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Try searching for “attendance”, “payslip”, “leave”, or “settings”
                  </p>
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const isSelected = idx === activeIndex;
                  const Icon = cmd.icon;
                  const catStyle = CATEGORY_COLORS[cmd.category] || { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" };

                  return (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition cursor-pointer group ${
                        isSelected
                          ? "bg-indigo-50/80 text-indigo-950 border border-indigo-200/80 shadow-2xs"
                          : "text-slate-700 hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      {/* Icon container */}
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                            : "bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-xs"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                            {cmd.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold ${catStyle.bg} ${catStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                            {cmd.category}
                          </span>
                          {cmd.badge && (
                            <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${cmd.badgeColor || "bg-indigo-100 text-indigo-700"}`}>
                              {cmd.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {cmd.hint}
                        </p>
                      </div>

                      {/* Right Action Hint */}
                      <div className="shrink-0 flex items-center gap-1 text-xs font-semibold text-slate-400">
                        {isSelected && (
                          <span className="flex items-center gap-1 text-indigo-600 font-bold bg-white px-2 py-0.5 rounded-md border border-indigo-100 shadow-2xs">
                            Select <CornerDownLeft className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Footer Info */}
            <div className="shrink-0 border-t border-slate-100 px-4 py-2.5 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-xs">↑</kbd>
                  <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-xs">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-xs">Enter</kbd>
                  Execute
                </span>
              </div>
              <span className="text-slate-400 font-medium">WorkPulse Pro Command Bar</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
