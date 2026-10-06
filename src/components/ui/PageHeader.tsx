"use client";

import React from "react";

export default function PageHeader({
  icon: Icon,
  title,
  description,
  badge,
  actions,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="wp-page-header flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/90 pb-5 mb-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
            Enterprise Module
          </span>
          {badge && (
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {badge}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 flex items-center gap-3">
          {Icon && (
            <span className="wp-page-icon inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30 ring-4 ring-indigo-50 shrink-0">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <span>{title}</span>
        </h1>
        {description && (
          <p className="mt-1.5 max-w-3xl text-xs sm:text-sm text-slate-500 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2.5 shrink-0 sm:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
