"use client";

import React, { useEffect, useState } from "react";
import { policyApi } from "@/lib/api";
import { unwrapItem } from "@/lib/utils";
import { SlidersHorizontal, Loader2, CheckCircle2, Globe, Building2, Check } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import { cyclePeriod, formatCycleDate, MONTH_NAMES } from "@/lib/payrollCycle";

const CYCLE_PRESETS = [
  { label: "Calendar month (1st to last day)", startDay: 1, endDay: 31 },
  { label: "1st to 30th", startDay: 1, endDay: 30 },
  { label: "5th to 5th", startDay: 5, endDay: 5 },
  { label: "20th to 20th", startDay: 20, endDay: 20 },
  { label: "21st to 20th", startDay: 21, endDay: 20 },
];

const DAY_BASIS_OPTIONS = [
  { value: "ACTUAL_DAYS", label: "Actual days in the cycle (28, 30 or 31)" },
  { value: "FIXED_30", label: "Always 30 days" },
  { value: "WORKING_DAYS", label: "Policy working days (set above)" },
];

const DEFAULTS = {
  payrollCycleStartDay: 1,
  payrollCycleEndDay: 31,
  payrollDayBasis: "ACTUAL_DAYS",
  workingDaysPerMonth: 26,
  probationMonths: 3,
  monthlyPermissionHours: 3,
  permissionRequiresProbation: true,
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
  const [customCycle, setCustomCycle] = useState(false);

  const matchedPreset = CYCLE_PRESETS.findIndex(
    (preset) => preset.startDay === form.payrollCycleStartDay && preset.endDay === form.payrollCycleEndDay,
  );
  const selectedPreset = customCycle || matchedPreset === -1 ? "custom" : String(matchedPreset);

  const applyPreset = (value: string) => {
    if (value === "custom") {
      setCustomCycle(true);
      return;
    }
    const preset = CYCLE_PRESETS[Number(value)];
    setCustomCycle(false);
    setForm((prev) => ({ ...prev, payrollCycleStartDay: preset.startDay, payrollCycleEndDay: preset.endDay }));
  };

  const now = new Date();
  const exampleMonth = now.getMonth() + 1;
  const exampleYear = now.getFullYear();
  const example = cyclePeriod(exampleMonth, exampleYear, form.payrollCycleStartDay, form.payrollCycleEndDay);
  const exampleLabel = `${MONTH_NAMES[exampleMonth - 1]} ${exampleYear}`;
  const exampleBasisDays =
    form.payrollDayBasis === "FIXED_30"
      ? 30
      : form.payrollDayBasis === "WORKING_DAYS"
        ? form.workingDaysPerMonth
        : example.days;

  useEffect(() => {
    (async () => {
      try {
        const res = await policyApi.get();
        const policy = unwrapItem<any>(res, ["policy"]) || res?.policy;
        if (policy) {
          setForm({
            workingDaysPerMonth: Number(policy.workingDaysPerMonth ?? DEFAULTS.workingDaysPerMonth),
            probationMonths: Number(policy.probationMonths ?? DEFAULTS.probationMonths),
            monthlyPermissionHours: Number(policy.monthlyPermissionHours ?? DEFAULTS.monthlyPermissionHours),
            permissionRequiresProbation: Boolean(policy.permissionRequiresProbation ?? DEFAULTS.permissionRequiresProbation),
            halfDayThresholdMinutes: Number(policy.halfDayThresholdMinutes ?? DEFAULTS.halfDayThresholdMinutes),
            maxLatesBeforeDeduction: Number(policy.maxLatesBeforeDeduction ?? DEFAULTS.maxLatesBeforeDeduction),
            lateDeductionPercent: Number(policy.lateDeductionPercent ?? DEFAULTS.lateDeductionPercent),
            allowWfh: Boolean(policy.allowWfh),
            requireOtApproval: Boolean(policy.requireOtApproval),
            geofenceStrict: Boolean(policy.geofenceStrict),
            payrollCycleStartDay: Number(policy.payrollCycleStartDay ?? DEFAULTS.payrollCycleStartDay),
            payrollCycleEndDay: Number(policy.payrollCycleEndDay ?? DEFAULTS.payrollCycleEndDay),
            payrollDayBasis: String(policy.payrollDayBasis ?? DEFAULTS.payrollDayBasis),
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

  // The check-in location rule applies to every employee at once, so it saves
  // immediately instead of waiting for the main "Save policy" button.
  const [savingLocation, setSavingLocation] = useState(false);
  const setLocationRule = async (officeOnly: boolean) => {
    if (officeOnly === form.geofenceStrict || savingLocation) return;
    const previous = form.geofenceStrict;
    setForm((prev) => ({ ...prev, geofenceStrict: officeOnly }));
    setSavingLocation(true);
    try {
      const res = await policyApi.update({ geofenceStrict: officeOnly });
      if (res?.success === false) throw new Error(res?.message || "Save failed");
      setIsDefault(false);
      toast.success(officeOnly ? "Office-only check-in is on" : "Check-in from anywhere is on", {
        description: officeOnly
          ? "Employees must be inside their branch radius to check in. Work From Home, Client Visit and Travel still work from anywhere."
          : "All employees can now check in from any location.",
      });
    } catch (err: any) {
      setForm((prev) => ({ ...prev, geofenceStrict: previous }));
      toast.error(err.response?.data?.message || err.message || "Couldn't update the check-in rule. Please try again.");
    } finally {
      setSavingLocation(false);
    }
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

      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs" aria-labelledby="checkin-location-heading">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="checkin-location-heading" className="text-sm font-semibold text-slate-900">Where can employees check in?</h2>
            <p className="text-xs text-slate-500">Applies to all employees right away. You can switch it back at any time.</p>
          </div>
          {savingLocation && <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" aria-label="Saving" />}
        </div>
        <div role="radiogroup" aria-labelledby="checkin-location-heading" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              officeOnly: false,
              icon: Globe,
              title: "Anywhere",
              body: "Employees can check in from any location. Their location is still recorded on each punch.",
            },
            {
              officeOnly: true,
              icon: Building2,
              title: "Office only",
              body: "Employees must be inside their branch radius. Work From Home, Client Visit and Travel still work from anywhere.",
            },
          ].map((option) => {
            const selected = form.geofenceStrict === option.officeOnly;
            return (
              <button
                key={option.title}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={savingLocation}
                onClick={() => void setLocationRule(option.officeOnly)}
                className={`relative text-left rounded-2xl border p-4 transition disabled:opacity-60 ${
                  selected ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <option.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{option.title}</span>
                  {selected && <Check className="ml-auto h-4 w-4 text-indigo-600" aria-hidden="true" />}
                </span>
                <span className="mt-2 block text-xs leading-5 text-slate-600">{option.body}</span>
              </button>
            );
          })}
        </div>
        {form.geofenceStrict && (
          <p className="text-xs text-slate-500">
            Each branch&apos;s location and radius are set on the Branches page. Branches without a location don&apos;t restrict check-in.
          </p>
        )}
      </section>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Payroll cycle</h2>
          <p className="text-xs text-slate-500">
            Set the days your salary period runs. A month&apos;s payroll can be generated once its last day has ended.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-600 uppercase">Cycle</span>
            <select
              value={selectedPreset}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              {CYCLE_PRESETS.map((preset, index) => (
                <option key={preset.label} value={String(index)}>
                  {preset.label}
                </option>
              ))}
              <option value="custom">Custom days</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-600 uppercase">Day basis for deductions</span>
            <select
              value={form.payrollDayBasis}
              onChange={(e) => setForm((prev) => ({ ...prev, payrollDayBasis: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              {DAY_BASIS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400">Sets the daily rate used for loss-of-pay and permission deductions.</span>
          </label>
        </div>
        {selectedPreset === "custom" && (
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 uppercase">Starts on day</span>
              <input
                type="number"
                min={1}
                max={31}
                value={form.payrollCycleStartDay}
                onChange={(e) => setNum("payrollCycleStartDay", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 uppercase">Ends on day</span>
              <input
                type="number"
                min={1}
                max={31}
                value={form.payrollCycleEndDay}
                onChange={(e) => setNum("payrollCycleEndDay", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </label>
          </div>
        )}
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          Example: payroll for {exampleLabel} runs {formatCycleDate(example.start)} to {formatCycleDate(example.end)} ({example.days} days).
          Deductions use {exampleBasisDays} days as the divisor.
        </p>
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
          <span className="text-xs font-semibold text-slate-600 uppercase">Leave eligibility wait (months)</span>
          <input type="number" min={0} max={24} value={form.probationMonths} onChange={(e) => setNum("probationMonths", e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          <span className="text-xs text-slate-400">Paid leave and permission unlock after this period.</span>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600 uppercase">Monthly permission hours</span>
          <input type="number" step="0.5" min={0} max={24} value={form.monthlyPermissionHours} onChange={(e) => setNum("monthlyPermissionHours", e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          <span className="text-xs text-slate-400">Example: 2 or 3 hours per month.</span>
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
          <input type="checkbox" checked={form.permissionRequiresProbation} onChange={(e) => setForm((p) => ({ ...p, permissionRequiresProbation: e.target.checked }))} />
          Require probation completion before paid leave and monthly permissions
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-800 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.requireOtApproval}
            onChange={(e) => setForm((p) => ({ ...p, requireOtApproval: e.target.checked }))}
          />
          Require manager approval before overtime is paid
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
