"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Save, Tag } from "lucide-react";
import { toast } from "sonner";
import { billingAdminApi } from "@/lib/api";
import { confirmDialog } from "@/components/ui/confirmDialog";
import PlatformNav from "@/components/platform/PlatformNav";

type Cycle = "MONTHLY" | "ANNUAL";
type Price = { id: string | null; plan: string; billingCycle: Cycle; priceInr: number; isActive: boolean };
type Offer = {
  id: string;
  code: string;
  label: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  maxDiscountInr: number | null;
  eligiblePlans: string[];
  eligibleCycles: string[];
  firstPaidOrderOnly: boolean;
  isActive: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
};

const PLANS = [
  { key: "STARTER", name: "Starter", blurb: "Small teams, up to 25 people" },
  { key: "PROFESSIONAL", name: "Professional", blurb: "Growing companies, up to 100 people" },
  { key: "ENTERPRISE", name: "Enterprise", blurb: "Large workforces, up to 10,000 people" },
];
const CYCLES: Cycle[] = ["MONTHLY", "ANNUAL"];
const planName = (key: string) => PLANS.find((p) => p.key === key)?.name || key;
const rupees = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

const emptyOffer = {
  code: "",
  label: "",
  type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  value: 20,
  maxDiscountInr: "",
  plans: [] as string[],
  cycles: [] as string[],
  firstPaidOrderOnly: false,
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-50";

export default function PlatformBillingView() {
  const [saved, setSaved] = useState<Price[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [offer, setOffer] = useState(emptyOffer);
  const [creating, setCreating] = useState(false);

  const keyOf = (plan: string, cycle: string) => `${plan}:${cycle}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [priceResult, offerResult] = await Promise.all([billingAdminApi.prices(), billingAdminApi.offers()]);
      const prices: Price[] = priceResult?.data || [];
      setSaved(prices);
      setDraft(Object.fromEntries(prices.map((p) => [keyOf(p.plan, p.billingCycle), String(p.priceInr)])));
      setOffers(offerResult?.data || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Pricing could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const savedPrice = (plan: string, cycle: Cycle) => saved.find((p) => p.plan === plan && p.billingCycle === cycle);
  const draftValue = (plan: string, cycle: Cycle) => draft[keyOf(plan, cycle)] ?? "";
  const isDirty = (plan: string, cycle: Cycle) => draftValue(plan, cycle) !== String(savedPrice(plan, cycle)?.priceInr ?? "");

  const savePrice = async (plan: string, cycle: Cycle) => {
    const value = Number(draftValue(plan, cycle));
    if (!Number.isInteger(value) || value < 0) {
      toast.error("Enter a whole rupee amount, 0 or more.");
      return;
    }
    const old = savedPrice(plan, cycle)?.priceInr ?? 0;
    const ok = await confirmDialog({
      title: `Change ${planName(plan)} ${cycle === "ANNUAL" ? "annual" : "monthly"} price?`,
      message: `${rupees(old)} becomes ${rupees(value)}. This applies to new checkouts only. Existing subscribers keep the price they paid.`,
      confirmLabel: "Save price",
      tone: "primary",
    });
    if (!ok) return;
    const key = keyOf(plan, cycle);
    setSavingKey(key);
    try {
      await billingAdminApi.updatePrice(plan, cycle, { priceInr: value, isActive: savedPrice(plan, cycle)?.isActive ?? true });
      setSaved((all) => all.map((p) => (p.plan === plan && p.billingCycle === cycle ? { ...p, priceInr: value } : p)));
      toast.success(`${planName(plan)} ${cycle === "ANNUAL" ? "annual" : "monthly"} price is now ${rupees(value)}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "The price could not be saved.");
    } finally {
      setSavingKey(null);
    }
  };

  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const createOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = offer.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
      toast.error("Use 3 to 24 letters or numbers for the code, for example FESTIVE25.");
      return;
    }
    if (!offer.label.trim()) {
      toast.error("Add a short description customers will see.");
      return;
    }
    if (offer.type === "PERCENTAGE" && (offer.value <= 0 || offer.value > 100)) {
      toast.error("A percentage offer must be between 1 and 100.");
      return;
    }
    setCreating(true);
    try {
      await billingAdminApi.createOffer({
        code,
        label: offer.label.trim(),
        type: offer.type,
        value: Number(offer.value),
        maxDiscountInr: offer.maxDiscountInr === "" ? null : Number(offer.maxDiscountInr),
        eligiblePlans: offer.plans,
        eligibleCycles: offer.cycles,
        firstPaidOrderOnly: offer.firstPaidOrderOnly,
      });
      setOffer(emptyOffer);
      toast.success(`Offer ${code} is live`);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "The offer could not be created.");
    } finally {
      setCreating(false);
    }
  };

  const deactivate = async (o: Offer) => {
    const ok = await confirmDialog({
      title: `Turn off ${o.code}?`,
      message: "Customers will no longer be able to apply this code. Past orders are not affected.",
      confirmLabel: "Turn off",
    });
    if (!ok) return;
    try {
      await billingAdminApi.deactivateOffer(o.id);
      toast.success(`${o.code} turned off`);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "The offer could not be turned off.");
    }
  };

  const activeOffers = useMemo(() => offers.filter((o) => o.isActive), [offers]);
  const inactiveOffers = useMemo(() => offers.filter((o) => !o.isActive), [offers]);

  const describeOffer = (o: Offer) => {
    const what = o.type === "PERCENTAGE" ? `${o.value}% off` : `${rupees(o.value)} off`;
    const cap = o.type === "PERCENTAGE" && o.maxDiscountInr ? `, up to ${rupees(o.maxDiscountInr)}` : "";
    const plans = o.eligiblePlans.length ? o.eligiblePlans.map(planName).join(", ") : "all plans";
    const cycles = o.eligibleCycles.length ? o.eligibleCycles.map((c) => c.toLowerCase()).join(" and ") : "any billing cycle";
    return `${what}${cap} · ${plans} · ${cycles}${o.firstPaidOrderOnly ? " · first purchase only" : ""}`;
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-600">Platform owner</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-slate-950">Pricing &amp; offers</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Set what each plan costs and create discount codes. Changes apply to new checkouts only. Existing subscribers keep what they paid.
          </p>
        </div>
        <PlatformNav active="billing" />
      </div>

      {loading ? (
        <div aria-busy="true" className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl border border-slate-100 bg-white" />
          ))}
        </div>
      ) : (
        <>
          {/* Prices */}
          <section aria-labelledby="prices-title">
            <h2 id="prices-title" className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Plan prices (INR, excluding tax)
            </h2>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              {PLANS.map((plan) => {
                const monthly = Number(draftValue(plan.key, "MONTHLY"));
                const annual = Number(draftValue(plan.key, "ANNUAL"));
                const saving = monthly > 0 && annual > 0 ? Math.round((1 - annual / (monthly * 12)) * 100) : null;
                return (
                  <article key={plan.key} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.35)]">
                    <h3 className="font-serif text-xl font-semibold text-slate-950">{plan.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-600">{plan.blurb}</p>

                    <div className="mt-5 space-y-4">
                      {CYCLES.map((cycle) => {
                        const key = keyOf(plan.key, cycle);
                        const dirty = isDirty(plan.key, cycle);
                        return (
                          <div key={cycle}>
                            <label htmlFor={`price-${key}`} className="flex items-center justify-between text-xs font-bold text-slate-700">
                              {cycle === "MONTHLY" ? "Per month" : "Per year"}
                              {dirty && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">Unsaved</span>}
                            </label>
                            <div className="mt-1.5 flex gap-2">
                              <div className="relative flex-1">
                                <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">₹</span>
                                <input
                                  id={`price-${key}`}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  step={1}
                                  value={draftValue(plan.key, cycle)}
                                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                                  className={`${inputClass} pl-7 font-semibold tabular-nums`}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => void savePrice(plan.key, cycle)}
                                disabled={!dirty || savingKey === key}
                                aria-label={`Save ${plan.name} ${cycle.toLowerCase()} price`}
                                className="keep-white inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-200 disabled:shadow-none disabled:[&_*]:!text-slate-400"
                              >
                                {savingKey === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {saving === null
                        ? "Set both prices to see the annual saving."
                        : saving > 0
                          ? `Annual saves customers ${saving}% against paying monthly.`
                          : saving === 0
                            ? "Annual costs the same as 12 months."
                            : `Annual costs ${Math.abs(saving)}% more than monthly. Check this.`}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          {/* New offer */}
          <section aria-labelledby="offer-title" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.35)]">
            <h2 id="offer-title" className="flex items-center gap-2 font-serif text-xl font-semibold text-slate-950">
              <Tag aria-hidden="true" className="h-5 w-5 text-indigo-600" />
              Create a discount code
            </h2>
            <form onSubmit={createOffer} className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="offer-code" className="mb-1 block text-xs font-bold text-slate-700">Code</label>
                <input id="offer-code" value={offer.code} onChange={(e) => setOffer({ ...offer, code: e.target.value.toUpperCase() })} placeholder="FESTIVE25" maxLength={24} className={`${inputClass} font-mono uppercase`} />
              </div>
              <div>
                <label htmlFor="offer-label" className="mb-1 block text-xs font-bold text-slate-700">What customers see</label>
                <input id="offer-label" value={offer.label} onChange={(e) => setOffer({ ...offer, label: e.target.value })} placeholder="25% off for the festive season" maxLength={80} className={inputClass} />
              </div>

              <div>
                <span className="mb-1 block text-xs font-bold text-slate-700">Discount</span>
                <div className="flex gap-2">
                  <div role="radiogroup" aria-label="Discount type" className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold">
                    {(["PERCENTAGE", "FIXED"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={offer.type === t}
                        onClick={() => setOffer({ ...offer, type: t })}
                        className={`rounded-lg px-3 py-1.5 transition ${offer.type === t ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"}`}
                      >
                        {t === "PERCENTAGE" ? "%" : "₹"}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={offer.value}
                    onChange={(e) => setOffer({ ...offer, value: Number(e.target.value) })}
                    aria-label={offer.type === "PERCENTAGE" ? "Percentage off" : "Rupees off"}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="offer-cap" className="mb-1 block text-xs font-bold text-slate-700">Maximum discount (optional)</label>
                <input id="offer-cap" type="number" min={0} value={offer.maxDiscountInr} onChange={(e) => setOffer({ ...offer, maxDiscountInr: e.target.value })} placeholder="No limit" disabled={offer.type === "FIXED"} className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`} />
              </div>

              <fieldset>
                <legend className="mb-1.5 text-xs font-bold text-slate-700">Applies to plans <span className="font-medium text-slate-500">(none selected means all)</span></legend>
                <div className="flex flex-wrap gap-2">
                  {PLANS.map((p) => {
                    const on = offer.plans.includes(p.key);
                    return (
                      <button key={p.key} type="button" role="checkbox" aria-checked={on} onClick={() => setOffer({ ...offer, plans: toggle(offer.plans, p.key) })} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                        {on && <Check className="h-3.5 w-3.5" />}
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-xs font-bold text-slate-700">Billing cycles <span className="font-medium text-slate-500">(none selected means both)</span></legend>
                <div className="flex flex-wrap gap-2">
                  {CYCLES.map((c) => {
                    const on = offer.cycles.includes(c);
                    return (
                      <button key={c} type="button" role="checkbox" aria-checked={on} onClick={() => setOffer({ ...offer, cycles: toggle(offer.cycles, c) })} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                        {on && <Check className="h-3.5 w-3.5" />}
                        {c === "MONTHLY" ? "Monthly" : "Annual"}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 md:col-span-2">
                <input type="checkbox" checked={offer.firstPaidOrderOnly} onChange={(e) => setOffer({ ...offer, firstPaidOrderOnly: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
                Only for a customer&rsquo;s first paid purchase
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="keep-white inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create code
                </button>
              </div>
            </form>
          </section>

          {/* Offers */}
          <section aria-labelledby="offers-title">
            <h2 id="offers-title" className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Discount codes ({activeOffers.length} live)
            </h2>
            {offers.length === 0 ? (
              <p className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-600">
                No discount codes yet. Create one above and customers can apply it at checkout.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                {[...activeOffers, ...inactiveOffers].map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-bold text-indigo-800 ring-1 ring-indigo-100">{o.code}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${o.isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>
                          {o.isActive ? "Live" : "Off"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-slate-900">{o.label}</p>
                      <p className="text-xs text-slate-600">{describeOffer(o)}</p>
                    </div>
                    {o.isActive && (
                      <button type="button" onClick={() => void deactivate(o)} className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500">
                        Turn off
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
