'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { WEB_APP_ROLES } from '@/lib/permissions';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute allowedRoles={WEB_APP_ROLES}>
      <div className="flex min-h-screen bg-[#f8fafc] text-slate-900">
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <div className="flex flex-1 flex-col pl-0 lg:pl-64 min-w-0">
          <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-7 min-w-0">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
