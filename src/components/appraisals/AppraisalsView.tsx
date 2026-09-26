"use client";

import React, { useEffect, useState } from "react";
import { appraisalsApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/ui/PageHeader";
import { Star } from "lucide-react";
import { toast } from "sonner";

export default function AppraisalsView() {
  const { role } = useAuth();
  const isAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "MANAGER";
  const [cycles, setCycles] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const my = await appraisalsApi.mine();
      setMine(unwrapList(my).length ? unwrapList(my) : my?.data || []);
      if (isAdmin) {
        const list = await appraisalsApi.list();
        setCycles(unwrapList(list).length ? unwrapList(list) : list?.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load appraisals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader icon={Star} title="Appraisals" description="Performance cycles and self / manager reviews." />
      {isAdmin && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await appraisalsApi.create(form);
            if (res?.success) {
              toast.success("Cycle created");
              load();
            } else toast.error(res?.message || "Failed");
          }}
          className="bg-white rounded-2xl border p-5 flex flex-wrap gap-3 text-xs"
        >
          <input required placeholder="Cycle name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 rounded-xl border" />
          <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="px-3 py-2 rounded-xl border" />
          <input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="px-3 py-2 rounded-xl border" />
          <button className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-semibold">Create cycle</button>
        </form>
      )}
      {loading && <div className="bg-white rounded-2xl border p-8 text-sm text-slate-500">Loading appraisals…</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border p-5 space-y-2">
          <h2 className="text-sm font-semibold">My reviews</h2>
          {!loading && mine.length === 0 && <p className="text-xs text-slate-500">No reviews assigned yet.</p>}
          {mine.map((r) => (
            <div key={r.id} className="border rounded-xl p-3 text-xs space-y-2">
              <p className="font-medium">{r.cycle?.name} · {r.status}</p>
              <input
                type="number"
                min={1}
                max={5}
                placeholder="Self score 1-5"
                className="w-full px-2 py-1.5 border rounded-lg"
                defaultValue={r.selfScore || ""}
                onBlur={(e) => appraisalsApi.submitSelf(r.id, { selfScore: Number(e.target.value) }).then(() => toast.success("Saved"))}
              />
            </div>
          ))}
        </div>
        {isAdmin && (
          <div className="bg-white rounded-2xl border p-5 space-y-2 text-xs">
            <h2 className="text-sm font-semibold">Cycles</h2>
            {!loading && cycles.length === 0 && <p className="text-xs text-slate-500">No appraisal cycles yet.</p>}
            {cycles.map((c) => (
              <p key={c.id}>
                {c.name} · {c.status} · {c._count?.reviews || 0} reviews
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
