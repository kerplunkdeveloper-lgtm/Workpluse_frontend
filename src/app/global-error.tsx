"use client";

/**
 * Last-resort fallback when the root layout itself fails. It replaces the whole
 * document, so it cannot rely on globals.css or shared components.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#f6f7fb", color: "#131931", fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <div role="alert" style={{ maxWidth: 420, margin: 16, padding: "40px 28px", textAlign: "center", background: "#fff", borderRadius: 24, boxShadow: "0 22px 54px -30px rgba(40,36,120,.28)", border: "1px solid #e1e4ee" }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>WorkPluse couldn&apos;t start</h1>
          <p style={{ margin: "10px 0 24px", fontSize: 14, lineHeight: 1.6, color: "#5b667c" }}>
            Something went wrong while loading the app. Your data is safe. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ height: 40, padding: "0 18px", border: 0, borderRadius: 12, background: "#4f46e5", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
          {error.digest && <p style={{ marginTop: 20, fontSize: 12, color: "#7c879d" }}>Reference: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
