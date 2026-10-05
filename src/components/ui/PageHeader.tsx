"use client";

import React from "react";

export default function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="wp-page-header flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-5">
      <div className="min-w-0">
        <p className="wp-eyebrow mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">Workspace</p>
        <h1 className="font-serif text-[30px] font-semibold tracking-tight text-slate-900 flex items-center gap-3">
          {Icon && (
            <span className="wp-page-icon inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_10px_20px_-12px_rgba(37,99,235,0.8)]">
              <Icon className="h-5 w-5" />
            </span>
          )}
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
