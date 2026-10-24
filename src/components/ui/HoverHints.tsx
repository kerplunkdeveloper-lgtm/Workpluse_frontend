"use client";

import { useEffect } from "react";

const TARGETS = "button, a, [role='button'], [role='tab'], [role='menuitem']";

/**
 * App-wide hover hints: icon-only controls that carry an aria-label but no
 * title get the label as a native tooltip the first time the pointer reaches
 * them, so every icon button names itself on hover without per-component edits.
 */
export default function HoverHints() {
  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(TARGETS);
      if (!el || el.hasAttribute("title")) return;
      const label = el.getAttribute("aria-label")?.trim();
      if (label) el.setAttribute("title", label);
    };
    document.addEventListener("mouseover", onOver, { passive: true });
    return () => document.removeEventListener("mouseover", onOver);
  }, []);

  return null;
}
