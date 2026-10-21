"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Home, RefreshCw, ServerCrash, WifiOff } from "lucide-react";

type StatusKind = "server" | "network";
type StatusState = { kind: StatusKind; status: number };

export default function SystemStatusOverlay() {
  const [statusState, setStatusState] = useState<StatusState | null>(null);

  useEffect(() => {
    const handleFailure = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: StatusKind; status?: number }>).detail;
      setStatusState({
        kind: detail?.kind === "network" ? "network" : "server",
        status: Number(detail?.status) || 0,
      });
    };

    window.addEventListener("workpulse:server-error", handleFailure);
    return () => window.removeEventListener("workpulse:server-error", handleFailure);
  }, []);

  if (!statusState) return null;

  const { kind, status } = statusState;
  const isNetwork = kind === "network";
  const errorCode = isNetwork ? "OFFLINE" : status || "500";
  const Icon = isNetwork ? WifiOff : ServerCrash;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f5f7fb]/95 px-6 py-10 backdrop-blur-md">
      <div className="relative w-full max-w-xl text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
          <span className="animate-ripple absolute inset-0 rounded-[2rem] border border-indigo-200/80" />
          <span className="absolute inset-2 rounded-[1.5rem] border border-indigo-100 bg-white shadow-[0_20px_60px_rgba(48,42,140,0.12)]" />
          <Icon className="relative h-9 w-9 text-indigo-600" strokeWidth={1.7} />
        </div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
          {isNetwork ? "Connection interrupted" : "WorkPluse service"}
        </p>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400" aria-label={`Error code ${errorCode}`}>
          Error code <span className="font-mono text-slate-600">{errorCode}</span>
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
          {isNetwork ? "We lost the connection" : "The service needs a moment"}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-slate-500">
          {isNetwork
            ? "Your work is safe. Check your connection and try again when you are back online."
            : "Something unexpected happened on our side. Please try again in a moment."}
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(79,70,229,0.22)] transition hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700"
          >
            <Home className="h-4 w-4" />
            Go to dashboard
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setStatusState(null)}
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Keep working offline
        </button>
      </div>
    </div>
  );
}