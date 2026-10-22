"use client";

import React from "react";
import { PauseCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/** Shown instead of the app when the platform owner has suspended this workspace. */
export default function WorkspaceSuspended() {
  const { user, logout } = useAuth();
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
        <PauseCircle aria-hidden="true" className="h-8 w-8" />
      </span>
      <h1 className="mt-5 font-serif text-2xl font-semibold text-slate-950">Workspace suspended</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        Access to {user?.organization?.name || "this workspace"} has been paused. Your data is safe and nothing has been deleted. Please contact WorkPulse support to
        restore access.
      </p>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-6 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
      >
        Sign out
      </button>
    </main>
  );
}
