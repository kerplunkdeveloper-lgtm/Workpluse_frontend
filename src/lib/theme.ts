/**
 * Appearance preference. "system" follows the OS setting; the resolved theme is
 * written to <html data-theme>, which src/app/theme-dark.css keys off. The value
 * is a per-browser convenience, so localStorage is the right home for it.
 */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "workpulse_theme";
const THEME_EVENT = "workpulse:theme";

export function readThemePreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref !== "system") return pref;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(pref: ThemePreference = readThemePreference()) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolveTheme(pref);
}

export function setThemePreference(pref: ThemePreference) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Storage blocked (private mode): the choice still applies for this page view.
  }
  applyTheme(pref);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: pref }));
}

/** Keeps "system" in sync when the OS switches, and other tabs in sync with this one. */
export function watchTheme(onChange: (pref: ThemePreference) => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    const pref = readThemePreference();
    applyTheme(pref);
    onChange(pref);
  };
  const onStorage = (e: StorageEvent) => e.key === THEME_STORAGE_KEY && sync();
  media.addEventListener("change", sync);
  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_EVENT, sync);
  return () => {
    media.removeEventListener("change", sync);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_EVENT, sync);
  };
}

/** Inlined in <head> so the right theme is set before first paint (no light flash). */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;
