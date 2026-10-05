"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { billingAdminApi } from "@/lib/api";

type Price = { id: string | null; plan: string; billingCycle: "MONTHLY" | "ANNUAL"; priceInr: number; isActive: boolean };
type Offer = { id: string; code: string; label: string; type: "PERCENTAGE" | "FIXED"; value: number; maxDiscountInr: number | null; eligiblePlans: string[]; eligibleCycles: string[]; firstPaidOrderOnly: boolean; isActive: boolean; startsAt?: string | null; expiresAt?: string | null };

const plans = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
const cycles = ["MONTHLY", "ANNUAL"] as const;

export default function PlatformBillingView() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newOffer, setNewOffer] = useState({ code: "", label: "", type: "PERCENTAGE", value: 20, maxDiscountInr: "", eligibleCycles: "", eligiblePlans: "", firstPaidOrderOnly: false });

  const load = async () => {
    setLoading(true);
    try {
      const [priceResult, offerResult] = await Promise.all([billingAdminApi.prices(), billingAdminApi.offers()]);
      setPrices(priceResult?.data || []);
      setOffers(offerResult?.data || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not load platform billing settings");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const updatePrice = async (price: Price) => {
    const key = `${price.plan}:${price.billingCycle}`;
    setSaving(key);
    try {
      await billingAdminApi.updatePrice(price.plan, price.billingCycle, { priceInr: Number(price.priceInr), isActive: price.isActive });
      toast.success(`${price.plan} ${price.billingCycle.toLowerCase()} price saved`);
    } catch (error: any) { toast.error(error?.response?.data?.message || "Could not save price"); }
    finally { setSaving(null); }
  };

  const createOffer = async () => {
    try {
      await billingAdminApi.createOffer({
        ...newOffer,
        code: newOffer.code.trim().toUpperCase(),
        value: Number(newOffer.value),
        maxDiscountInr: newOffer.maxDiscountInr === "" ? null : Number(newOffer.maxDiscountInr),
        eligibleCycles: newOffer.eligibleCycles.split(",").map((v) => v.trim().toUpperCase()).filter(Boolean),
        eligiblePlans: newOffer.eligiblePlans.split(",").map((v) => v.trim().toUpperCase()).filter(Boolean),
      });
      setNewOffer({ code: "", label: "", type: "PERCENTAGE", value: 20, maxDiscountInr: "", eligibleCycles: "", eligiblePlans: "", firstPaidOrderOnly: false });
      toast.success("Offer created");
      await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || "Could not create offer"); }
  };

  const deactivateOffer = async (id: string) => {
    try { await billingAdminApi.deactivateOffer(id); toast.success("Offer deactivated"); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Could not deactivate offer"); }
  };

  if (loading) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return <div className="mx-auto max-w-6xl space-y-8 p-6">
    <div><h1 className="text-2xl font-bold text-slate-950">Platform Billing</h1><p className="mt-1 text-sm text-slate-500">Manage global subscription prices and promotional offers. Changes apply to new checkouts only.</p></div>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Plan prices (INR)</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {prices.map((price) => { const key = `${price.plan}:${price.billingCycle}`; return <div key={key} className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between"><span className="font-semibold">{price.plan}</span><span className="text-xs text-slate-500">{price.billingCycle}</span></div>
          <input type="number" min="0" value={price.priceInr} onChange={(event) => setPrices((all) => all.map((item) => item === price ? { ...item, priceInr: Number(event.target.value) } : item))} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2" />
          <button onClick={() => void updatePrice(price)} disabled={saving === key} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save size={15} />{saving === key ? "Saving…" : "Save price"}</button>
        </div>; })}
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Create promotional offer</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <input placeholder="Code e.g. FESTIVE25" value={newOffer.code} onChange={(e) => setNewOffer({ ...newOffer, code: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
        <input placeholder="Offer label" value={newOffer.label} onChange={(e) => setNewOffer({ ...newOffer, label: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
        <select value={newOffer.type} onChange={(e) => setNewOffer({ ...newOffer, type: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2"><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed INR</option></select>
        <input type="number" min="0" placeholder="Value" value={newOffer.value} onChange={(e) => setNewOffer({ ...newOffer, value: Number(e.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2" />
        <input type="number" min="0" placeholder="Max discount (optional)" value={newOffer.maxDiscountInr} onChange={(e) => setNewOffer({ ...newOffer, maxDiscountInr: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
        <input placeholder="Plans: STARTER,PROFESSIONAL" value={newOffer.eligiblePlans} onChange={(e) => setNewOffer({ ...newOffer, eligiblePlans: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
        <input placeholder="Cycles: ANNUAL" value={newOffer.eligibleCycles} onChange={(e) => setNewOffer({ ...newOffer, eligibleCycles: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" checked={newOffer.firstPaidOrderOnly} onChange={(e) => setNewOffer({ ...newOffer, firstPaidOrderOnly: e.target.checked })} /> First paid order only</label>
      </div>
      <button onClick={() => void createOffer()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><Plus size={16} />Create offer</button>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Offers</h2><div className="mt-4 space-y-3">{offers.map((offer) => <div key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div><div className="font-semibold">{offer.code} <span className="ml-2 text-sm font-normal text-slate-500">{offer.label}</span></div><div className="mt-1 text-xs text-slate-500">{offer.type === "PERCENTAGE" ? `${offer.value}%` : `₹${offer.value}`} · {offer.isActive ? "Active" : "Inactive"}</div></div>{offer.isActive && <button onClick={() => void deactivateOffer(offer.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"><Ban size={15} />Deactivate</button>}</div>)}</div></section>
  </div>;
}
