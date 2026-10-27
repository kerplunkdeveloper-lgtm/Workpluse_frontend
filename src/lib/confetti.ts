/**
 * Celebration burst. The confetti library loads only when a burst is fired, so it stays out of every page's
 * first download, and it is skipped for people who ask their device to reduce motion.
 */
export function confetti(options?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  void import("canvas-confetti")
    .then((module) => module.default(options))
    .catch(() => {});
}
