"use client";

import React, { useEffect, useState } from "react";
import { policyApi } from "@/lib/api";
import { unwrapItem } from "@/lib/utils";
import { SlidersHorizontal, Loader2, CheckCircle2, Globe, Building2, Check, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import WeeklyOffCard from "./WeeklyOffCard";
import { cyclePeriod, formatCycleDate, MONTH_NAMES } from "@/lib/payrollCycle";
import Select from "@/components/ui/Select";

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
  // The company weekly off saves on its own (it updates every shift), not with the main "Save policy" button.
  const [weeklyOff, setWeeklyOff] = useState("0");
  const [customCycle, setCustomCycle] = useState(false);
  const [lateRules, setLateRules] = useState<any[]>([]);
  const [lateRuleForm, setLateRuleForm] = useState({ lateDays: "", lopDays: "1", graceMinutes: "15", isActive: true, remarks: "" });
  const [editingLateRuleId, setEditingLateRuleId] = useState<string | null>(null);
  const [lateRulesLoading, setLateRulesLoading] = useState(true);
  const [lateRuleSaving, setLateRuleSaving] = useState(false);

  const loadLateRules = async () => {
    try {
      const res = await policyApi.listLateComingLop();
      setLateRules(res?.rules || res?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load late-coming rules");
    } finally {
      setLateRulesLoading(false);
    }
  };

  useEffect(() => { void loadLateRules(); }, []);

  const resetLateRuleForm = () => {
    setLateRuleForm({ lateDays: "", lopDays: "1", graceMinutes: "15", isActive: true, remarks: "" });
    setEditingLateRuleId(null);
  };

  const saveLateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLateRuleSaving(true);
    try {
      const payload = { ...lateRuleForm, lateDays: Number(lateRuleForm.lateDays), lopDays: Number(lateRuleForm.lopDays), graceMinutes: Number(lateRuleForm.graceMinutes) };
      if (editingLateRuleId) await policyApi.updateLateComingLop(editingLateRuleId, payload);
      else await policyApi.createLateComingLop(payload);
      toast.success(editingLateRuleId ? "Late-coming rule updated" : "Late-coming rule added");
      resetLateRuleForm();
      await loadLateRules();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Could not save rule");
    } finally {
      setLateRuleSaving(false);
    }
  };

  const editLateRule = (rule: any) => {
    setEditingLateRuleId(rule.id);
    setLateRuleForm({ lateDays: String(rule.lateDays), lopDays: String(rule.lopDays), graceMinutes: String(rule.graceMinutes ?? 0), isActive: Boolean(rule.isActive), remarks: rule.remarks || "" });
  };

  const deleteLateRule = async (id: string) => {
    if (!window.confirm("Delete this late-coming LOP rule?")) return;
    try { await policyApi.deleteLateComingLop(id); toast.success("Late-coming rule deleted"); if (editingLateRuleId === id) resetLateRuleForm(); await loadLateRules(); }
    catch (err: any) { toast.error(err.response?.data?.message || "Could not delete rule"); }
  };

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
          setWeeklyOff(String(policy.weeklyOffDays ?? "0"));
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

  // The punch-in location rule applies to every employee at once, so it saves
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
      toast.success(officeOnly ? "Office-only punch-in is on" : "Punch-in from anywhere is on", {
        description: officeOnly
          ? "Employees must be inside their branch radius to punch in. Work From Home, Client Visit and Travel still work from anywhere."
          : "All employees can now punch in from any location.",
      });
    } catch (err: any) {
      setForm((prev) => ({ ...prev, geofenceStrict: previous }));
      toast.error(err.response?.data?.message || err.message || "Couldn't update the punch-in rule. Please try again.");
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

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(260px,0.34fr)_minmax(0,1fr)] gap-5 items-start">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-lg font-semibold text-slate-950">Company Late-coming LOP Policy</h2>
          <p className="mt-1 text-xs text-slate-500">Create a rule for every completed block of late arrivals in a payroll cycle.</p>
          <form onSubmit={saveLateRule} className="mt-5 space-y-4">
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">Late days <span className="text-rose-500">*</span></span><input required type="number" min="1" step="1" value={lateRuleForm.lateDays} onChange={(e) => setLateRuleForm((p) => ({ ...p, lateDays: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" /><span className="text-xs text-slate-400">Every this many late arrivals counts as LOP.</span></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">LOP days <span className="text-rose-500">*</span></span><Select required value={lateRuleForm.lopDays} onChange={(e) => setLateRuleForm((p) => ({ ...p, lopDays: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"><option value="0.5">0.5 day</option><option value="1">1 day</option><option value="1.5">1.5 days</option><option value="2">2 days</option></Select><span className="text-xs text-slate-400">LOP applied for each completed block of late days.</span></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">Grace (minutes)</span><input type="number" min="0" max="1440" value={lateRuleForm.graceMinutes} onChange={(e) => setLateRuleForm((p) => ({ ...p, graceMinutes: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" /><span className="text-xs text-slate-400">Punch-in after shift start + grace counts as late.</span></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">Status</span><Select value={lateRuleForm.isActive ? "true" : "false"} onChange={(e) => setLateRuleForm((p) => ({ ...p, isActive: e.target.value === "true" }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"><option value="true">Active</option><option value="false">Inactive</option></Select></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">Remarks</span><input value={lateRuleForm.remarks} onChange={(e) => setLateRuleForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional note" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" /></label>
            <div className="flex gap-3 pt-1"><button disabled={lateRuleSaving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />{lateRuleSaving ? "Saving..." : editingLateRuleId ? "Update Rule" : "Save Policy"}</button>{editingLateRuleId && <button type="button" onClick={resetLateRuleForm} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600">Cancel</button>}</div>
          </form>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs overflow-x-auto">
          <h2 className="text-lg font-semibold text-slate-950">Late-coming LOP Rules</h2>
          {lateRulesLoading ? <div className="py-12 text-center text-sm text-slate-400">Loading rules...</div> : lateRules.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">No rules yet. Add the first late-coming rule.</div> : <table className="mt-6 w-full min-w-[720px] text-left"><thead><tr className="text-xs font-semibold text-slate-400"><th className="pb-3">S.No</th><th className="pb-3">Late Days</th><th className="pb-3">LOP Days</th><th className="pb-3">Grace Time</th><th className="pb-3">Status</th><th className="pb-3">Remarks</th><th className="pb-3 text-right">Action</th></tr></thead><tbody>{lateRules.map((rule, index) => <tr key={rule.id} className="border-t border-dashed border-slate-200 text-sm text-slate-800"><td className="py-4">{index + 1}</td><td className="py-4 font-semibold">{rule.lateDays} late days</td><td className="py-4">{rule.lopDays} LOP day(s)</td><td className="py-4 text-cyan-600">◷ {rule.graceMinutes} mins</td><td className="py-4"><span className={`rounded-lg px-3 py-2 text-xs font-semibold ${rule.isActive ? "bg-sky-50 text-sky-600" : "bg-slate-100 text-slate-500"}`}>{rule.isActive ? "Active" : "Inactive"}</span></td><td className="py-4 max-w-[180px] truncate text-slate-500">{rule.remarks || "-"}</td><td className="py-4"><div className="flex justify-end gap-2"><button type="button" title="Edit rule" onClick={() => editLateRule(rule)} className="rounded-lg bg-cyan-50 p-2 text-cyan-600 hover:bg-cyan-100"><Pencil className="h-4 w-4" /></button><button type="button" title="Delete rule" onClick={() => void deleteLateRule(rule.id)} className="rounded-lg bg-rose-50 p-2 text-rose-500 hover:bg-rose-100"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table>}
        </div>
      </section>

      <WeeklyOffCard saved={weeklyOff} onSaved={(days) => { setWeeklyOff(days); setIsDefault(false); }} />

      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs" aria-labelledby="checkin-location-heading">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="checkin-location-heading" className="text-sm font-semibold text-slate-900">Where can employees punch in?</h2>
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
              body: "Employees can punch in from any location. Their location is still recorded on each punch.",
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
            Each branch&apos;s location and radius are set on the Branches page. Branches without a location don&apos;t restrict punch-in.
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
            <Select
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
            </Select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-600 uppercase">Day basis for deductions</span>
            <Select
              value={form.payrollDayBasis}
              onChange={(e) => setForm((prev) => ({ ...prev, payrollDayBasis: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              {DAY_BASIS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
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
