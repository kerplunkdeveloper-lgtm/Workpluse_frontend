"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { readThemePreference, setThemePreference, watchTheme, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/** Three-way appearance control: follow the OS, or pin light / dark. */
export default function ThemeSwitcher({ className = "" }: { className?: string }) {
  const [pref, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    setPref(readThemePreference());
    return watchTheme(setPref);
  }, []);

  return (
    <div role="radiogroup" aria-label="Appearance" className={`grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 ${className}`}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = pref === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setThemePreference(value)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
              on ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/[0.06]" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
