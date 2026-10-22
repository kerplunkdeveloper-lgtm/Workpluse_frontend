"use client";

import { useEffect } from "react";
import { ErrorCard } from "@/components/ui/ErrorBoundary";

/** Route-level fallback for pages outside the app shell (auth, public pages). */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[WorkPulse] Route failed:", error);
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-16">
      <ErrorCard onRetry={reset} reference={error.digest} code={500} />
    </main>
  );
}
