"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "workpluse-cookie-consent-v1";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!window.localStorage.getItem(CONSENT_KEY));
    } catch {
      setVisible(false);
    }
  }, []);

  const choose = (analytics: boolean) => {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ necessary: true, analytics, savedAt: new Date().toISOString() }));
    } catch {
      // Necessary session cookies still work when storage is unavailable.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      role="dialog"
      aria-label="Cookie choices"
      aria-describedby="cookie-consent-copy"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:inset-x-6 sm:bottom-6 sm:flex sm:items-center sm:gap-5 sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-slate-950">Your cookie choices</h2>
        <p id="cookie-consent-copy" className="mt-1 text-xs leading-5 text-slate-600">
          WorkPluse uses necessary storage for sign-in, security and preferences. Optional analytics cookies are off until you choose them. Read the <Link href="/cookies" className="font-semibold text-indigo-700 underline underline-offset-2">Cookie Notice</Link> and <Link href="/privacy" className="font-semibold text-indigo-700 underline underline-offset-2">Privacy Notice</Link>.
        </p>
      </div>
      <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">
        <button type="button" onClick={() => choose(false)} className="min-h-10 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2">Necessary only</button>
        <button type="button" onClick={() => choose(true)} className="min-h-10 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2">Allow analytics</button>
      </div>
    </aside>
  );
}
