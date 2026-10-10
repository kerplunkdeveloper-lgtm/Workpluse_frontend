"use client";

import React from "react";

export default function AppSkeletonLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Sidebar Skeleton (Desktop) */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-slate-950 border-r border-slate-800 p-5 space-y-6 shrink-0">
        {/* Brand Logo Skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-28 bg-slate-800 rounded-md animate-pulse" />
            <div className="h-2.5 w-16 bg-slate-800/60 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Navigation Items Skeleton */}
        <div className="space-y-2.5 flex-1 pt-2">
          
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            >
              <div className="w-4 h-4 rounded-lg bg-slate-800 animate-pulse shrink-0" />
              <div
                className="h-3.5 rounded-md bg-slate-800 animate-pulse"
                style={{ width: `${60 + (i % 3) * 15}%` }}
              />
            </div>
          ))}
        </div>

        {/* Bottom Org Plan Meter Skeleton */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="h-3 w-20 bg-slate-800 rounded animate-pulse" />
          <div className="h-2 w-full bg-slate-800 rounded animate-pulse" />
        </div>
      </aside>

      {/* Main Content Area Skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Skeleton */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="lg:hidden w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-40 bg-slate-100 rounded-xl animate-pulse hidden sm:block" />
            <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" />
            <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse" />
          </div>
        </header>

        {/* Dashboard Body Skeleton */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-7 overflow-y-auto">
          {/* Hero Banner Skeleton */}
          <div className="rounded-3xl p-7 bg-gradient-to-r from-sky-50/90 via-indigo-50/50 to-white border border-sky-100 overflow-hidden shadow-xs relative">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2">
                <div className="h-5 w-32 bg-slate-200/80 rounded-full animate-pulse" />
                <div className="h-5 w-24 bg-slate-200/80 rounded-full animate-pulse" />
              </div>
              <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-4 w-96 bg-slate-100 rounded animate-pulse" />
              <div className="pt-2 flex items-center gap-3">
                <div className="h-7 w-32 bg-slate-200/70 rounded-xl animate-pulse" />
                <div className="h-7 w-36 bg-slate-200/70 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>

          {/* Punch Terminal Card Skeleton */}
          <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 flex flex-col items-center space-y-3 p-4">
              <div className="h-3 w-36 bg-slate-200 rounded-full animate-pulse" />
              <div className="h-12 w-48 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-4">
              <div className="w-36 h-36 rounded-full bg-slate-100 border-4 border-slate-200 animate-pulse" />
            </div>
            <div className="lg:col-span-3 space-y-2.5 p-2">
              <div className="h-12 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />
              <div className="h-12 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />
            </div>
          </div>

          {/* 4 Metric Cards Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="w-7 h-7 rounded-xl bg-slate-100 animate-pulse" />
                </div>
                <div className="h-8 w-16 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-2 w-28 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Bottom Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="h-4 w-44 bg-slate-200 rounded animate-pulse" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-50 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="h-4 w-36 bg-slate-200 rounded animate-pulse" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-50 rounded-2xl animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
