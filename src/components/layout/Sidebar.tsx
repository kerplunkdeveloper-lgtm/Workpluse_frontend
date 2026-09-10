'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getRoleBadgeDetails } from '@/lib/permissions';
import { UserRole } from '@/types/auth';
import {
  LayoutDashboard,
  Building2,
  Clock,
  Users,
  CalendarCheck,
  CalendarDays,
  Banknote,
  ShieldCheck,
  Settings,
  ChevronRight,
  PlusCircle,
  PartyPopper,
  UserPlus,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
      { label: 'Leave Management', href: '/leaves', icon: CalendarDays },
      { label: 'Holidays', href: '/holidays', icon: PartyPopper },
      { label: 'Payroll & Payslips', href: '/payroll', icon: Banknote },
    ],
  },
  {
    title: 'Workforce & Operations',
    items: [
      { label: 'Shifts & Policies', href: '/shifts', icon: Clock, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'] },
      { label: 'Employees', href: '/employees', icon: Users, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'] },
      { label: 'Onboarding', href: '/onboarding', icon: UserPlus, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Organization', href: '/organization', icon: Building2, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
      { label: 'RBAC Permissions', href: '/permissions', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
      { label: 'Settings', href: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const roleBadge = getRoleBadgeDetails(user?.role);

  const employeeName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName || ''}`.trim()
    : 'Alex Vance';

  const roleLabel = roleBadge.label || 'Company Admin';
  const userRole = user?.role;

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  // Filter sections and items based on logged-in user's role
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles) return true;
        if (userRole && item.roles.includes(userRole)) return true;
        return false;
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-100 bg-white px-3.5 py-4 shadow-sm select-none overflow-hidden transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pb-3.5 border-b border-slate-100/80 shrink-0 mb-1">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl shadow-sm border border-slate-100 bg-white p-0.5">
              <img
                src="/workpulse-logo.png"
                alt="WorkPulse Logo"
                className="h-full w-full object-contain rounded-xl"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center leading-none">
                <span className="text-base font-black tracking-tight text-slate-950">Work</span>
                <span className="text-base font-black tracking-tight text-[#0284c7]">Pulse</span>
                <span className="text-[9px] font-bold text-slate-400 ml-0.5">™</span>
              </div>
              <p className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase mt-1">
                People • Time • Growth
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Role-Based Filtered Navigation Links */}
        <nav className="flex-1 overflow-y-auto pr-1 py-2 flex flex-col gap-3 min-h-0">
          {visibleSections.map((section, idx) => (
            <div key={section.title || idx} className="space-y-1">
              {visibleSections.length > 1 && section.title && (
                <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </p>
              )}
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      prefetch={true}
                      onClick={handleLinkClick}
                      className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all shrink-0 ${
                        isActive
                          ? 'bg-[#4f46e5] text-white font-semibold shadow-sm shadow-indigo-500/30'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {!isActive && (
                        <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Fixed Section (Shrink-0 to guarantee ZERO overlap) */}
        <div className="shrink-0 pt-2.5 border-t border-slate-100 flex flex-col gap-2.5 bg-white">
          {/* Compact Support Card */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50/90 via-sky-50/60 to-blue-50/80 p-3 border border-indigo-100/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-2xs border border-indigo-100/80">
                  <PlusCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Need Help?</span>
              </div>
              <a
                href="mailto:support@workpulse.com"
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Contact Support
              </a>
            </div>
          </div>

          {/* User Profile Pill */}
          <div className="pt-1">
            <Link
              href="/profile"
              onClick={handleLinkClick}
              className="flex items-center gap-2.5 rounded-2xl p-1.5 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
            >
              <div className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-xs shadow-xs">
                  {employeeName[0]?.toUpperCase() || 'A'}
                </div>
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate text-xs font-bold text-slate-900 leading-tight">
                  {employeeName}
                </span>
                <span className="truncate text-[10px] font-medium text-slate-400">
                  {roleLabel}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
