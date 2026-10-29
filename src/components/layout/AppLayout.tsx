"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Brand from "@/components/ui/Brand";
import { useAttendance } from "@/context/AttendanceContext";
import { Settings, Bell, LogOut, ChevronRight, ChevronDown, ShieldCheck, CheckCircle2, MapPin, Coffee, Menu, X, FileCheck2, Search, MessageSquare, HelpCircle, ChevronsLeft, ChevronsRight, Command, Home, Megaphone, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { employeesApi, notificationsApi, orgApi } from "@/lib/api";
import { NotificationItem } from "@/types";
import { roleLabel, unwrapList } from "@/lib/utils";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import { watchTheme } from "@/lib/theme";
import PunchConfirmDialog, { PunchConfirmAction } from "@/components/attendance/PunchConfirmDialog";
import { SubscriptionBanner } from "@/components/billing/WorkspaceBilling";
import CommandPalette from "./CommandPalette";
import CompanyLogo from "@/components/ui/CompanyLogo";
import ShortcutsHelpModal from "./ShortcutsHelpModal";
import { NAV_SECTIONS, PLATFORM_SECTIONS, DESKTOP_NAV_SCROLL_KEY, MOBILE_NAV_SCROLL_KEY, isNavActive, itemVisible, itemMatches, timeAgo } from "./navConfig";
import { enableWebPushNotifications } from "@/lib/webPush";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, logout } = useAuth();
  const isPlatformOwner = role === "SUPER_ADMIN";
  const { todayStatus, checkIn, checkOut, startBreak, endBreak, isActionLoading, isWithinGeofence, locationLabel } = useAttendance();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileMenuOpen(false);
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen]);
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
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [hrAccess, setHrAccess] = useState<Record<string, boolean> | null>(null);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = broadcastTitle.trim();
    const message = broadcastMessage.trim();
    if (!title || !message) {
      toast.error("Title and message are required");
      return;
    }
    setSendingBroadcast(true);
    try {
      const res = await notificationsApi.broadcast({ title, message });
      if (res?.success) {
        toast.success(res.message || `Announcement dispatched to active employees`);
        setBroadcastOpen(false);
        setBroadcastTitle("");
        setBroadcastMessage("");
        try {
          const updated = await notificationsApi.getAll();
          const items = unwrapList<NotificationItem>(updated);
          setNotifications(items);
          setUnreadCount(
            typeof updated?.unreadCount === "number"
              ? updated.unreadCount
              : items.filter((n) => !n.isRead).length
          );
        } catch {}
      } else {
        toast.error(res?.message || "Could not send broadcast notification");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to broadcast");
    } finally {
      setSendingBroadcast(false);
    }
  };

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

  // Register this browser for server push so notifications still arrive when
  // the dashboard tab is closed. Permission denial is intentionally silent.
  useEffect(() => {
    if (!user?.id) return;
    void enableWebPushNotifications().catch(() => {});
  }, [user?.id]);

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

    // Reminders arrive while the app is open, so keep the bell current instead of loading it once.
    const refresh = () => {
      if (document.visibilityState === "visible") loadNotifications();
    };
    const timer = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const openNotification = async (n: NotificationItem) => {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)));
      setUnreadCount((count) => Math.max(0, count - 1));
      try {
        await notificationsApi.markRead(n.id);
      } catch {
        // The next refresh puts the real state back.
      }
    }
    // Punch reminders take you straight to where you punch.
    if (n.type === "ATTENDANCE") {
      setNotificationsOpen(false);
      router.push("/attendance");
    }
  };

  useEffect(() => { if (role === "MANAGER" || role === "HR") orgApi.get().then((res) => setHrAccess(res?.data?.hrAccess || null)).catch(() => setHrAccess(null)); else setHrAccess(null); }, [role]);
  const hrAreaForHref = (href: string) => { if (href.startsWith("/dashboard") || href.startsWith("/profile")) return "DASHBOARD"; if (href.startsWith("/attendance") || href.startsWith("/leaves") || href.startsWith("/approvals")) return "ATTENDANCE"; if (href.startsWith("/employees")) return "EMPLOYEES"; if (href.startsWith("/onboarding") || href.startsWith("/offboarding")) return "ONBOARDING"; if (href.startsWith("/payroll") || href.startsWith("/statutory")) return "PAYROLL"; if (href.startsWith("/reports")) return "REPORTS"; if (href.startsWith("/branches") || href.startsWith("/departments")) return "BRANCHES"; if (href.startsWith("/policy") || href.startsWith("/holidays") || href.startsWith("/shifts")) return "POLICIES"; return null; };
  const canSeeHrArea = (href: string) => { if ((role !== "MANAGER" && role !== "HR") || !hrAccess) return true; const area = hrAreaForHref(href); return !area || hrAccess[area] !== false; };
  const visibleSections = (isPlatformOwner ? PLATFORM_SECTIONS : NAV_SECTIONS).map((section) => ({
    ...section,
    items: section.items.filter((item) => itemVisible(item, role, user?.features) && canSeeHrArea(item.href) && itemMatches(item, navQuery)),
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

  const deleteNotification = async (notification: NotificationItem) => {
    setNotifications((prev) => prev.filter((item) => item.id !== notification.id));
    if (!notification.isRead) setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await notificationsApi.remove(notification.id);
    } catch {
      // Restore the item if the server could not delete it.
      setNotifications((prev) => prev.some((item) => item.id === notification.id) ? prev : [notification, ...prev]);
      if (!notification.isRead) setUnreadCount((count) => count + 1);
    }
  };

  const isCheckedIn = Boolean(
    todayStatus?.hasCheckedIn || todayStatus?.attendance?.checkIn
  ) && !Boolean(todayStatus?.hasCheckedOut || todayStatus?.attendance?.checkOut);
  const isOnBreak = todayStatus?.isOnBreak;

  const orgName = user?.organization?.name || "WorkPluse";
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

  const userRoleDisplay = roleLabel(role);

  // "System" appearance follows the OS even when the menu with the switcher is closed.
  useEffect(() => watchTheme(() => undefined), []);

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
        className={`wp-sidebar hidden lg:flex flex-col min-h-0 ${
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
            className="min-w-0"
          />

          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-slate-300 ring-1 ring-white/15 hover:bg-indigo-500/30 hover:text-white hover:ring-indigo-300/40 transition cursor-pointer"
              title="Collapse menu (Ctrl+B)"
              aria-label="Collapse menu"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
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
              className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-slate-300 ring-1 ring-white/15 hover:bg-indigo-500/30 hover:text-white hover:ring-indigo-300/40 transition cursor-pointer"
              title="Expand menu (Ctrl+B)"
              aria-label="Expand menu"
            >
              <ChevronsRight className="w-4 h-4" />
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
          className="wp-nav-scroll flex-1 px-2.5 py-3 space-y-3.5"
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
        <div className={`wp-sidebar-footer shrink-0 ${sidebarCollapsed ? "p-2" : "p-3"} pt-2 border-t border-white/[0.06]`}>

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
          <div className="flex items-center gap-3 min-w-0 lg:shrink-0">
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
                <span className="hidden sm:inline">WorkPluse</span>
              </Link>

              {/* The section label only appears where there is room; its chevron
                  travels with it so narrow screens never show an empty step. */}
              {currentSection && (
                <span className="hidden 2xl:flex items-center gap-1.5 text-slate-600 font-medium shrink-0">
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className={`w-1.5 h-1.5 rounded-full ${currentSection.dot}`} />
                  {currentSection.title}
                </span>
              )}

              {currentItem && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="min-w-0 truncate whitespace-nowrap text-sm font-semibold tracking-[-0.01em] text-slate-900 lg:shrink-0">
                    {currentItem.label}
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
            {!isPlatformOwner && role !== "COMPANY_ADMIN" && (
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
                  {isCheckedIn ? (isOnBreak ? "On Break" : "Punched In") : "Punched Out"}
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
                    className="fixed left-1/2 top-16 z-50 flex w-[min(calc(100vw-1.5rem),24rem)] max-h-[min(72dvh,34rem)] -translate-x-1/2 flex-col rounded-2xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem] sm:translate-x-0"
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

                    <div className="max-h-64 space-y-2 overflow-y-auto text-xs">
                      {filteredNotifications.length === 0 ? (
                        <div className="py-8 text-center text-slate-400">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                          <p className="font-semibold text-slate-600">All caught up!</p>
                          <p className="text-xs">No notifications to show right now.</p>
                        </div>
                      ) : (
                        filteredNotifications.slice(0, 8).map((n) => (
                          <NotificationRow
                            key={n.id}
                            notification={n}
                            onOpen={openNotification}
                            onDelete={deleteNotification}
                          />
                        ))
                      )}
                    </div>

                    {/* Admin and HR Announcement broadcast action */}
                    {(role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "MANAGER") && (
                      <div className="pt-2.5 mt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false);
                            setBroadcastOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 text-xs font-semibold transition cursor-pointer"
                        >
                          <Megaphone className="w-3.5 h-3.5" />
                          Send announcement to all employees
                        </button>
                      </div>
                    )}
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

            {/* Language selector */}

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
                  <p className="text-xs font-medium text-slate-500">{userRoleDisplay}</p>
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
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
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
                        <span>My profile & documents</span>
                      </Link>
                      <Link
                        href={user?.role === "SUPER_ADMIN" ? "/platform/security" : "/security"}
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                        <span>Sign-in security</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                  <span>Organization & billing</span>
                      </Link>
                      <Link
                        href="/chat"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span>Team chat</span>
                      </Link>
                    </div>

                    <div className="h-px bg-slate-100 my-1" />

                    <div className="px-3 py-2">
                  <p className="mb-1.5 text-[11px] font-medium text-slate-500">Appearance</p>
                      <ThemeSwitcher />
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
                      <span>Sign out</span>
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
            <div className="lg:hidden fixed inset-0 z-50">
            {/* Dimmed backdrop: the page stays visible on the right; tapping it closes the menu */}
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              className="wp-mobile-drawer absolute inset-y-0 left-0 w-[80%] max-w-[360px] bg-slate-950 text-slate-200 p-5 pl-[max(1.25rem,env(safe-area-inset-left))] pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col rounded-r-3xl shadow-[24px_0_60px_-20px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <Brand href="/dashboard" inverse />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-2 rounded-xl bg-white/[0.08] text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!isPlatformOwner && role !== "COMPANY_ADMIN" && (
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
                    Punch In
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setPendingPunch("CHECK_OUT");
                    }}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-600 text-white"
                  >
                    Punch Out
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
                className="wp-nav-scroll flex-1 py-4 space-y-3"
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
                  <p className="text-xs font-medium text-indigo-300">{userRoleDisplay}</p>
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
            </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Main Application Canvas */}
        <main className="wp-main-canvas min-w-0 flex-1 h-full overflow-y-auto p-3 sm:p-6 lg:p-8 bg-slate-50 pb-[max(5rem,calc(env(safe-area-inset-bottom)+2rem))] sm:pb-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="min-h-full"
          >
            <SubscriptionBanner />
            <ErrorBoundary resetKey={pathname || ""}>{children}</ErrorBoundary>
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

      {/* Broadcast Announcement Modal for Admin and HR */}
      {broadcastOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => !sendingBroadcast && setBroadcastOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[min(90dvh,calc(100dvh-4rem))] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all text-slate-900"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Megaphone className="h-5 w-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">Notify All Employees</h3>
              </div>
              <button
                type="button"
                onClick={() => setBroadcastOpen(false)}
                disabled={sendingBroadcast}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Sends an instant in-app announcement to every active employee in your company.
            </p>
            <form onSubmit={handleSendBroadcast} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Office Holiday Notice, Company Townhall, Policy Update..."
                  maxLength={120}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type your company-wide notification here..."
                  maxLength={1000}
                  rows={4}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBroadcastOpen(false)}
                  disabled={sendingBroadcast}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {sendingBroadcast && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {sendingBroadcast ? "Sending..." : "Send Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onOpen,
  onDelete,
}: {
  notification: NotificationItem;
  onOpen: (notification: NotificationItem) => void;
  onDelete: (notification: NotificationItem) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setDragging(true);
    startX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const distance = event.touches[0]?.clientX - startX.current;
    if (Number.isFinite(distance) && distance < 0) setOffset(Math.max(-92, distance));
  };
  const onTouchEnd = () => {
    if (startX.current === null) return;
    setOffset((current) => (current <= -48 ? -92 : 0));
    startX.current = null;
    setDragging(false);
  };
  const onTouchCancel = () => {
    startX.current = null;
    setOffset(0);
    setDragging(false);
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      <button
        type="button"
        aria-label={`Delete ${notification.title}`}
        onClick={() => onDelete(notification)}
        style={{ opacity: offset < -8 ? 1 : 0 }}
        className="absolute inset-y-0 right-0 z-0 flex w-[92px] items-center justify-center gap-1 bg-rose-600 text-xs font-semibold text-white transition-opacity duration-200"
      >
        <Trash2 className="h-4 w-4" /> Delete
      </button>
      <button
        type="button"
        onClick={() => (offset < 0 ? setOffset(0) : onOpen(notification))}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        className={`relative z-10 block w-full text-left p-3 rounded-xl border hover:border-indigo-200 ${dragging ? "" : "transition-transform duration-200 ease-out"} ${
          notification.isRead
            ? "bg-slate-50/70 border-slate-100 text-slate-600"
            : "bg-indigo-50/50 border-indigo-100 text-slate-900 font-medium"
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-bold text-slate-900">{notification.title}</span>
          {!notification.isRead && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />}
        </div>
        <p className="text-slate-600 text-xs leading-relaxed">{notification.message}</p>
        <p className="mt-1.5 text-[11px] text-slate-400">{timeAgo(notification.createdAt)}</p>
      </button>
    </div>
  );
}
