"use client";

import React, { useEffect, useState } from "react";
import { policyApi } from "@/lib/api";
import { unwrapItem } from "@/lib/utils";
import { SlidersHorizontal, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";

const DEFAULTS = {
  workingDaysPerMonth: 26,
  halfDayThresholdMinutes: 240,
  maxLatesBeforeDeduction: 3,
  lateDeductionPercent: 0.25,
  allowWfh: true,
  requireOtApproval: false,
  geofenceStrict: false,
};

export default function PolicyView() {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await policyApi.get();
        const policy = unwrapItem<any>(res, ["policy"]) || res?.policy;
        if (policy) {
          setForm({
            workingDaysPerMonth: Number(policy.workingDaysPerMonth ?? DEFAULTS.workingDaysPerMonth),
            halfDayThresholdMinutes: Number(policy.halfDayThresholdMinutes ?? DEFAULTS.halfDayThresholdMinutes),
            maxLatesBeforeDeduction: Number(policy.maxLatesBeforeDeduction ?? DEFAULTS.maxLatesBeforeDeduction),
            lateDeductionPercent: Number(policy.lateDeductionPercent ?? DEFAULTS.lateDeductionPercent),
            allowWfh: Boolean(policy.allowWfh),
            requireOtApproval: Boolean(policy.requireOtApproval),
            geofenceStrict: Boolean(policy.geofenceStrict),
          });
          setIsDefault(Boolean(policy.isDefault));
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to load policy");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setNum = (key: keyof typeof DEFAULTS, value: string) => {
    setForm((prev) => ({ ...prev, [key]: Number(value) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await policyApi.update(form);
      if (res?.success) {
        toast.success(res.message || "Attendance policy saved");
        setIsDefault(false);
      } else {
        toast.error(res?.message || "Save failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        Loading policy…
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <div>
        <PageHeader
          icon={SlidersHorizontal}
          title="Attendance policy"
          description="Rules used at punch time and during payroll: working days, half-day cut-off, late deduction, WFH, OT, geofence."
        />
        {isDefault && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            These are platform defaults. Save once to lock them for this organization.
          </p>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-xs">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600 uppercase">Working days / month</span>
          <input
            type="number"
            min={1}
            max={31}
            value={form.workingDaysPerMonth}
            onChange={(e) => setNum("workingDaysPerMonth", e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600 uppercase">Half-day threshold (minutes)</span>
          <input
            type="number"
            min={0}
            value={form.halfDayThresholdMinutes}
            onChange={(e) => setNum("halfDayThresholdMinutes", e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600 uppercase">Lates before deduction</span>
          <input
            type="number"
            min={0}
            value={form.maxLatesBeforeDeduction}
            onChange={(e) => setNum("maxLatesBeforeDeduction", e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600 uppercase">Late deduction (fraction of daily rate)</span>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={form.lateDeductionPercent}
            onChange={(e) => setNum("lateDeductionPercent", e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-800 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.allowWfh}
            onChange={(e) => setForm((p) => ({ ...p, allowWfh: e.target.checked }))}
          />
          Allow work-from-home punch
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-800 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.requireOtApproval}
            onChange={(e) => setForm((p) => ({ ...p, requireOtApproval: e.target.checked }))}
          />
          Require manager approval before overtime is paid
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-800 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.geofenceStrict}
            onChange={(e) => setForm((p) => ({ ...p, geofenceStrict: e.target.checked }))}
          />
          Strict geofence — reject punches outside branch radius (off = punch from any location)
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        Save policy
      </button>
    </form>
  );
}
