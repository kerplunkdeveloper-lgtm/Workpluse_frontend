"use client";

import { useEffect } from "react";
import { ErrorCard } from "@/components/ui/ErrorBoundary";
import { logClientError } from "@/lib/clientLogger";

export default function LeavesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logClientError("route.render_failed", { route: "/leaves", digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-16">
      <ErrorCard onRetry={reset} reference={error.digest} code={500} />
    </main>
  );
}