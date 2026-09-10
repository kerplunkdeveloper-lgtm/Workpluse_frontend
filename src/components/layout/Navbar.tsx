'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getRoleBadgeDetails } from '@/lib/permissions';
import api from '@/lib/api';
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  LogOut,
  Check,
  CheckCheck,
  CalendarCheck,
  CalendarDays,
  Banknote,
  UserPlus,
  AlertCircle,
  X,
  Menu,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface NavbarProps {
  onMenuClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const roleBadge = getRoleBadgeDetails(user?.role);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [stickyToast, setStickyToast] = useState<NotificationItem | null>(null);
  const [dismissedToastIds, setDismissedToastIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const employeeName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName || ''}`.trim()
    : 'Alex Vance';

  const orgName = user?.organization?.name || 'WorkPulse Technologies';
  const roleLabel = roleBadge.label || 'Company Admin';

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.notifications) {
        const notifs: NotificationItem[] = res.data.notifications;
        setNotifications(notifs);
        setUnreadCount(res.data.unreadCount || 0);

        // Check for latest unread attendance reminder (morning/evening)
        const unreadAttendance = notifs.find(
          (n) => n.type === 'ATTENDANCE' && !n.isRead && !dismissedToastIds.includes(n.id)
        );
        if (unreadAttendance) {
          setStickyToast(unreadAttendance);
        }
      }
    } catch (err) {
      // Fallback notifications if none exist yet
      setNotifications([
        {
          id: 'mock-1',
          title: 'Shift Punch Confirmed',
          message: 'Your check-in at Pondicherry HQ was recorded on time.',
          type: 'ATTENDANCE',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'mock-2',
          title: 'Monthly Payroll Approved',
          message: 'September 2026 payroll batch has been approved by HR.',
          type: 'PAYROLL',
          isRead: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ]);
      setUnreadCount(2);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ATTENDANCE':
        return <CalendarCheck className="h-4 w-4 text-blue-600" />;
      case 'LEAVE':
        return <CalendarDays className="h-4 w-4 text-emerald-600" />;
      case 'PAYROLL':
        return <Banknote className="h-4 w-4 text-purple-600" />;
      case 'ONBOARDING':
        return <UserPlus className="h-4 w-4 text-amber-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-indigo-600" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-100 bg-white/95 px-4 sm:px-6 backdrop-blur-md select-none">
      {/* Left side: Mobile Hamburger Button */}
      <div className="flex items-center">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 lg:hidden shadow-2xs shrink-0 active:scale-95 transition-transform"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notifications Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all shadow-2xs ${
              showNotifications
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Interactive Notifications Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-76 sm:w-96 rounded-3xl border border-slate-100 bg-white p-4 shadow-xl shadow-slate-200/60 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="mt-2 max-h-80 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No notifications right now
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                      className={`group flex items-start gap-3 rounded-2xl p-2.5 transition-all cursor-pointer ${
                        n.isRead
                          ? 'bg-slate-50/50 hover:bg-slate-100/60 text-slate-600'
                          : 'bg-indigo-50/40 hover:bg-indigo-50/80 text-slate-900 border border-indigo-100/60'
                      }`}
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs border border-slate-100">
                        {getTypeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-bold truncate ${!n.isRead ? 'text-indigo-950' : 'text-slate-800'}`}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[9px] font-medium text-slate-400">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Organization Selector Pill (Hidden on mobile < md) */}
        <div className="hidden md:flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer hover:bg-slate-50 transition-colors">
          <img src="/workpulse-logo.png" alt="WorkPulse" className="h-4 w-4 object-contain rounded-xs" />
          <span className="truncate max-w-[140px]">{orgName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </div>

        {/* User Pill */}
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-1 sm:pl-1.5 sm:pr-2.5 sm:py-1 text-xs hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shadow-xs">
            {employeeName[0]?.toUpperCase() || 'A'}
          </div>
          <div className="hidden sm:flex flex-col items-start leading-tight">
            <span className="font-bold text-slate-800 text-xs truncate max-w-[110px]">{employeeName}</span>
            <span className="text-[10px] font-medium text-slate-400">{roleLabel}</span>
          </div>
          <ChevronRight className="hidden sm:block h-3.5 w-3.5 text-slate-300" />
        </Link>

        {/* Logout Quick Button */}
        <button
          onClick={logout}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-2xs active:scale-95"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Sticky Top-Right Attendance Reminder Toast */}
      {stickyToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="rounded-2xl border border-indigo-200/90 bg-white/95 p-4 shadow-2xl shadow-indigo-500/15 backdrop-blur-md ring-1 ring-slate-900/5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {stickyToast.title}
                  </h4>
                  <button
                    onClick={() => {
                      setDismissedToastIds((prev) => [...prev, stickyToast.id]);
                      setStickyToast(null);
                    }}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {stickyToast.message}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href="/attendance"
                    onClick={() => {
                      handleMarkAsRead(stickyToast.id);
                      setStickyToast(null);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-xs"
                  >
                    Go to Attendance
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => {
                      handleMarkAsRead(stickyToast.id);
                      setStickyToast(null);
                    }}
                    className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    Mark as read
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

