"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";

const LIGHT = { background: "#ffffff", border: "1px solid #e1e4ee", color: "#131931" };
const DARK = { background: "#161d31", border: "1px solid #2a3249", color: "#eef0f6" };

/**
 * Toasts match the surface they appear over: dark only inside the signed-in app
 * when the dark theme is active (public pages always stay light, like theme-dark.css).
 */
export default function ThemedToaster() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const check = () =>
      setDark(document.documentElement.dataset.theme === "dark" && Boolean(document.querySelector(".wp-app-shell, .wp-app-skeleton")));
    check();
    // The app shell mounts after auth resolves, so re-check shortly after navigation too.
    const late = window.setTimeout(check, 400);
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      window.clearTimeout(late);
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <Toaster
      theme={dark ? "dark" : "light"}
      position="top-right"
      className="wp-sonner-toaster"
      richColors
      closeButton
      toastOptions={{ style: dark ? DARK : LIGHT }}
    />
  );
}
