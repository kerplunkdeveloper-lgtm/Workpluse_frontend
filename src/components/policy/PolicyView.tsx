"use client";

import React, { useEffect, useState } from "react";
import { policyApi } from "@/lib/api";
import { unwrapItem } from "@/lib/utils";
import { SlidersHorizontal, Loader2, CheckCircle2, Globe, Building2, Check, Pencil, Trash2, CalendarDays, MapPin, Smartphone, WalletCards, Save } from "lucide-react";
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
  monthlyPaidLeaveDays: 1,
  paidLeaveCarryForward: true,
  monthlyPermissionHours: 3,
  permissionRequiresProbation: true,
  leaveEligibilityActive: true,
  halfDayThresholdMinutes: 240,
  maxLatesBeforeDeduction: 3,
  lateDeductionPercent: 0.25,
  breakDeductionEnabled: false,
  lunchDeductionEnabled: false,
  breakGraceMinutes: 0,
  lunchGraceMinutes: 0,
  pauseDeductionSalaryBasis: "BASE_SALARY",
  breakDeductionMethod: "HOURLY_RATE",
  lunchDeductionMethod: "HOURLY_RATE",
  breakFixedPerMinute: 0,
  lunchFixedPerMinute: 0,
  maxPauseDeductionPerDay: 0,
  allowWfh: true,
  requireOtApproval: false,
  geofenceStrict: false,
  deviceVerificationEnabled: true,
  deviceConflictAlertEnabled: true,
  deviceConflictAutoBlock: false,
  allowSharedKioskDevice: false,
  shootRecoveryEnabled: true,
  shootRecoveryThresholdMinutes: 720,
  shootTravelOtEnabled: true,
  shootTravelOtThresholdMinutes: 360,
  shootTravelOtMultiplier: 0.5,
  shootOtMultiplier: 1.5,
  shootOtSalaryBasis: "BASE_SALARY",
};

const PANEL = "rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_32px_-24px_rgba(15,23,42,0.22)]";

type LateRule = { id: string; lateDays: number; lopDays: number; graceMinutes: number; isActive: boolean; remarks?: string | null };
type PolicyRecord = Partial<typeof DEFAULTS> & { isDefault?: boolean; weeklyOffDays?: string | number };

const errorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; response?: { data?: { message?: unknown } } };
    if (typeof value.response?.data?.message === "string") return value.response.data.message;
    if (typeof value.message === "string") return value.message;
  }
  return fallback;
};

export default function PolicyView() {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  // The company weekly off saves on its own (it updates every shift), not with the main "Save policy" button.
  const [weeklyOff, setWeeklyOff] = useState("0");
  const [customCycle, setCustomCycle] = useState(false);
  const [lateRules, setLateRules] = useState<LateRule[]>([]);
  const [lateRuleForm, setLateRuleForm] = useState({ lateDays: "", lopDays: "1", graceMinutes: "15", isActive: true, remarks: "" });
  const [editingLateRuleId, setEditingLateRuleId] = useState<string | null>(null);
  const [lateRulesLoading, setLateRulesLoading] = useState(true);
  const [lateRuleSaving, setLateRuleSaving] = useState(false);

  const loadLateRules = async () => {
    try {
      const res = await policyApi.listLateComingLop();
      setLateRules(res?.rules || res?.data || []);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Failed to load late-coming rules"));
    } finally {
      setLateRulesLoading(false);
    }
  };

  // This effect intentionally loads the company rules when the policy screen opens.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadLateRules(); }, []);

  const resetLateRuleForm = () => {
    setLateRuleForm({ lateDays: "", lopDays: "1", graceMinutes: "15", isActive: true, remarks: "" });
    setEditingLateRuleId(null);
  };

  const applyLatePreset = (lateDays: number, lopDays: string, graceMinutes: number, remarks: string) => {
    setLateRuleForm({ lateDays: String(lateDays), lopDays, graceMinutes: String(graceMinutes), isActive: true, remarks });
    setEditingLateRuleId(null);
  };

  const saveLateRule = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLateRuleSaving(true);
    try {
      const payload = { ...lateRuleForm, lateDays: Number(lateRuleForm.lateDays), lopDays: Number(lateRuleForm.lopDays), graceMinutes: Number(lateRuleForm.graceMinutes) };
      if (editingLateRuleId) await policyApi.updateLateComingLop(editingLateRuleId, payload);
      else await policyApi.createLateComingLop(payload);
      toast.success(editingLateRuleId ? "Late-coming rule updated" : "Late-coming rule added");
      resetLateRuleForm();
      await loadLateRules();
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Could not save rule"));
    } finally {
      setLateRuleSaving(false);
    }
  };

  const editLateRule = (rule: LateRule) => {
    setEditingLateRuleId(rule.id);
    setLateRuleForm({ lateDays: String(rule.lateDays), lopDays: String(rule.lopDays), graceMinutes: String(rule.graceMinutes ?? 0), isActive: Boolean(rule.isActive), remarks: rule.remarks || "" });
  };

  const deleteLateRule = async (id: string) => {
    if (!window.confirm("Delete this late-coming LOP rule?")) return;
    try { await policyApi.deleteLateComingLop(id); toast.success("Late-coming rule deleted"); if (editingLateRuleId === id) resetLateRuleForm(); await loadLateRules(); }
    catch (err: unknown) { toast.error(errorMessage(err, "Could not delete rule")); }
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
        const policy = unwrapItem<PolicyRecord>(res, ["policy"]) || res?.policy;
        if (policy) {
          setForm({
            workingDaysPerMonth: Number(policy.workingDaysPerMonth ?? DEFAULTS.workingDaysPerMonth),
            probationMonths: Number(policy.probationMonths ?? DEFAULTS.probationMonths),
            monthlyPaidLeaveDays: Number(policy.monthlyPaidLeaveDays ?? DEFAULTS.monthlyPaidLeaveDays),
            paidLeaveCarryForward: Boolean(policy.paidLeaveCarryForward ?? DEFAULTS.paidLeaveCarryForward),
            monthlyPermissionHours: Number(policy.monthlyPermissionHours ?? DEFAULTS.monthlyPermissionHours),
            permissionRequiresProbation: Boolean(policy.permissionRequiresProbation ?? DEFAULTS.permissionRequiresProbation),
            leaveEligibilityActive: Boolean(policy.leaveEligibilityActive ?? policy.permissionRequiresProbation ?? DEFAULTS.leaveEligibilityActive),
            halfDayThresholdMinutes: Number(policy.halfDayThresholdMinutes ?? DEFAULTS.halfDayThresholdMinutes),
            maxLatesBeforeDeduction: Number(policy.maxLatesBeforeDeduction ?? DEFAULTS.maxLatesBeforeDeduction),
            lateDeductionPercent: Number(policy.lateDeductionPercent ?? DEFAULTS.lateDeductionPercent),
            breakDeductionEnabled: Boolean(policy.breakDeductionEnabled ?? DEFAULTS.breakDeductionEnabled),
            lunchDeductionEnabled: Boolean(policy.lunchDeductionEnabled ?? DEFAULTS.lunchDeductionEnabled),
            breakGraceMinutes: Number(policy.breakGraceMinutes ?? DEFAULTS.breakGraceMinutes),
            lunchGraceMinutes: Number(policy.lunchGraceMinutes ?? DEFAULTS.lunchGraceMinutes),
            pauseDeductionSalaryBasis: String(policy.pauseDeductionSalaryBasis ?? DEFAULTS.pauseDeductionSalaryBasis),
            breakDeductionMethod: String(policy.breakDeductionMethod ?? DEFAULTS.breakDeductionMethod),
            lunchDeductionMethod: String(policy.lunchDeductionMethod ?? DEFAULTS.lunchDeductionMethod),
            breakFixedPerMinute: Number(policy.breakFixedPerMinute ?? DEFAULTS.breakFixedPerMinute),
            lunchFixedPerMinute: Number(policy.lunchFixedPerMinute ?? DEFAULTS.lunchFixedPerMinute),
            maxPauseDeductionPerDay: Number(policy.maxPauseDeductionPerDay ?? DEFAULTS.maxPauseDeductionPerDay),
            allowWfh: Boolean(policy.allowWfh),
            requireOtApproval: Boolean(policy.requireOtApproval),
            geofenceStrict: Boolean(policy.geofenceStrict),
            deviceVerificationEnabled: Boolean(policy.deviceVerificationEnabled ?? DEFAULTS.deviceVerificationEnabled),
            deviceConflictAlertEnabled: Boolean(policy.deviceConflictAlertEnabled ?? DEFAULTS.deviceConflictAlertEnabled),
            deviceConflictAutoBlock: Boolean(policy.deviceConflictAutoBlock ?? DEFAULTS.deviceConflictAutoBlock),
            allowSharedKioskDevice: Boolean(policy.allowSharedKioskDevice ?? DEFAULTS.allowSharedKioskDevice),
            shootRecoveryEnabled: Boolean(policy.shootRecoveryEnabled ?? DEFAULTS.shootRecoveryEnabled),
            shootRecoveryThresholdMinutes: Number(policy.shootRecoveryThresholdMinutes ?? DEFAULTS.shootRecoveryThresholdMinutes),
            shootTravelOtEnabled: Boolean(policy.shootTravelOtEnabled ?? DEFAULTS.shootTravelOtEnabled),
            shootTravelOtThresholdMinutes: Number(policy.shootTravelOtThresholdMinutes ?? DEFAULTS.shootTravelOtThresholdMinutes),
            shootTravelOtMultiplier: Number(policy.shootTravelOtMultiplier ?? DEFAULTS.shootTravelOtMultiplier),
            shootOtMultiplier: Number(policy.shootOtMultiplier ?? DEFAULTS.shootOtMultiplier),
            shootOtSalaryBasis: String(policy.shootOtSalaryBasis ?? DEFAULTS.shootOtSalaryBasis),
            payrollCycleStartDay: Number(policy.payrollCycleStartDay ?? DEFAULTS.payrollCycleStartDay),
            payrollCycleEndDay: Number(policy.payrollCycleEndDay ?? DEFAULTS.payrollCycleEndDay),
            payrollDayBasis: String(policy.payrollDayBasis ?? DEFAULTS.payrollDayBasis),
          });
          setWeeklyOff(String(policy.weeklyOffDays ?? "0"));
          setIsDefault(Boolean(policy.isDefault));
        }
      } catch (err: unknown) {
        toast.error(errorMessage(err, "Failed to load policy"));
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
    } catch (err: unknown) {
      setForm((prev) => ({ ...prev, geofenceStrict: previous }));
      toast.error(errorMessage(err, "Couldn't update the punch-in rule. Please try again."));
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
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Save failed"));
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
    <form onSubmit={handleSave} className="mx-auto w-full max-w-[1240px] space-y-5 pb-24">
      <div>
        <PageHeader
          icon={SlidersHorizontal}
          title="Attendance policy"
          badge={isDefault ? "Platform defaults" : "Organization policy"}
          description="Control attendance, payroll, leave, device security and break deductions from one policy workspace."
          actions={
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save policy"}
            </button>
          }
        />
        {isDefault && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><span className="mt-0.5 font-bold">!</span><p><strong>Platform defaults are active.</strong> Save this policy once to create the organization&apos;s own policy settings.</p></div>
        )}
      </div>

      <PolicyOverview form={form} weeklyOff={weeklyOff} />
      <nav className={`${PANEL} flex gap-2 overflow-x-auto p-2`} aria-label="Policy sections">
        {[['late-coming-policy', 'Late coming'], ['weekly-off-policy', 'Weekly off'], ['checkin-location-heading', 'Punch location'], ['device-security-heading', 'Device security'], ['payroll-cycle-policy', 'Payroll'], ['leave-policy', 'Leave & permissions'], ['pause-deduction-heading', 'Break & lunch'], ['shoot-policy-heading', 'Shoot & travel']].map(([id, title]) => <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700">{title}</a>)}
      </nav>

      <section id="late-coming-policy" className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(260px,0.34fr)_minmax(0,1fr)] items-start">
        <div className={PANEL}>
          <h2 className="text-lg font-semibold text-slate-950">Company Late-coming LOP Policy</h2>
          <p className="mt-1 text-xs text-slate-500">Configure the grace window and the salary impact for each completed block of late arrivals in the payroll cycle.</p>
          <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Quick setup</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => applyLatePreset(3, "1", 15, "Standard: 3 late arrivals after 15 minutes = 1 LOP day")} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-100">Standard · 3 → 1 LOP</button>
              <button type="button" onClick={() => applyLatePreset(2, "1", 15, "Strict: 2 late arrivals after 15 minutes = 1 LOP day")} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-100">Strict · 2 → 1 LOP</button>
              <button type="button" onClick={() => applyLatePreset(5, "1", 15, "Flexible: 5 late arrivals after 15 minutes = 1 LOP day")} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-100">Flexible · 5 → 1 LOP</button>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-indigo-800">Presets only fill the form. Click Save Policy to apply the selected company rule.</p>
          </div>
          <div className="mt-5 space-y-4">
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">Late days <span className="text-rose-500">*</span></span><input required type="number" min="1" step="1" value={lateRuleForm.lateDays} onChange={(e) => setLateRuleForm((p) => ({ ...p, lateDays: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" /><span className="text-xs text-slate-400">Every this many late arrivals counts as LOP.</span></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">LOP days <span className="text-rose-500">*</span></span><Select required value={lateRuleForm.lopDays} onChange={(e) => setLateRuleForm((p) => ({ ...p, lopDays: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"><option value="0.5">0.5 day</option><option value="1">1 day</option><option value="1.5">1.5 days</option><option value="2">2 days</option></Select><span className="text-xs text-slate-400">LOP applied for each completed block of late days.</span></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">Grace (minutes)</span><input type="number" min="0" max="1440" value={lateRuleForm.graceMinutes} onChange={(e) => setLateRuleForm((p) => ({ ...p, graceMinutes: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" /><span className="text-xs text-slate-400">Punch-in after shift start + grace counts as late.</span></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">Status</span><Select value={lateRuleForm.isActive ? "true" : "false"} onChange={(e) => setLateRuleForm((p) => ({ ...p, isActive: e.target.value === "true" }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"><option value="true">Active</option><option value="false">Inactive</option></Select></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">Remarks</span><input value={lateRuleForm.remarks} onChange={(e) => setLateRuleForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional note" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm" /></label>
            <div className="flex gap-3 pt-1"><button disabled={lateRuleSaving} type="button" onClick={() => void saveLateRule()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />{lateRuleSaving ? "Saving..." : editingLateRuleId ? "Update Rule" : "Save Policy"}</button>{editingLateRuleId && <button type="button" onClick={resetLateRuleForm} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600">Cancel</button>}</div>
          </div>
        </div>
        <div className={`${PANEL} overflow-x-auto`}>
          <h2 className="text-lg font-semibold text-slate-950">Late-coming LOP Rules</h2>
          {lateRulesLoading ? <div className="py-12 text-center text-sm text-slate-400">Loading rules...</div> : lateRules.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">No rules yet. Add the first late-coming rule.</div> : <table className="mt-6 w-full min-w-[720px] text-left"><thead><tr className="text-xs font-semibold text-slate-400"><th className="pb-3">S.No</th><th className="pb-3">Late Days</th><th className="pb-3">LOP Days</th><th className="pb-3">Grace Time</th><th className="pb-3">Status</th><th className="pb-3">Remarks</th><th className="pb-3 text-right">Action</th></tr></thead><tbody>{lateRules.map((rule, index) => <tr key={rule.id} className="border-t border-dashed border-slate-200 text-sm text-slate-800"><td className="py-4">{index + 1}</td><td className="py-4 font-semibold">{rule.lateDays} late days</td><td className="py-4">{rule.lopDays} LOP day(s)</td><td className="py-4 text-cyan-600">◷ {rule.graceMinutes} mins</td><td className="py-4"><span className={`rounded-lg px-3 py-2 text-xs font-semibold ${rule.isActive ? "bg-sky-50 text-sky-600" : "bg-slate-100 text-slate-500"}`}>{rule.isActive ? "Active" : "Inactive"}</span></td><td className="py-4 max-w-[180px] truncate text-slate-500">{rule.remarks || "-"}</td><td className="py-4"><div className="flex justify-end gap-2"><button type="button" title="Edit rule" onClick={() => editLateRule(rule)} className="rounded-lg bg-cyan-50 p-2 text-cyan-600 hover:bg-cyan-100"><Pencil className="h-4 w-4" /></button><button type="button" title="Delete rule" onClick={() => void deleteLateRule(rule.id)} className="rounded-lg bg-rose-50 p-2 text-rose-500 hover:bg-rose-100"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table>}
        </div>
      </section>

      <section id="weekly-off-policy"><WeeklyOffCard saved={weeklyOff} onSaved={(days) => { setWeeklyOff(days); setIsDefault(false); }} /></section>

      <section id="punch-location-policy" className={PANEL + " space-y-4"} aria-labelledby="checkin-location-heading">
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

      <section id="device-security-policy" className={PANEL + " space-y-4"} aria-labelledby="device-security-heading">
        <div>
          <h2 id="device-security-heading" className="text-sm font-semibold text-slate-900">Device security & duplicate punch alerts</h2>
          <p className="text-xs text-slate-500">Register the employee&apos;s device and show a review alert when the same personal device is used by another employee.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["deviceVerificationEnabled", "Enable device verification", "Record device name, type and unique ID with every punch."],
            ["requireTrustedDevice", "Require HR-approved device", "Unapproved devices cannot punch in."],
            ["deviceConflictAlertEnabled", "Alert HR on duplicate device", "Create a HIGH-risk audit event for another employee using the device."],
            ["deviceConflictAutoBlock", "Block duplicate device automatically", "Reject the punch instead of waiting for HR review."],
            ["allowSharedKioskDevice", "Allow shared office kiosk devices", "Use this only for an approved shared desktop/tablet."],
          ].map(([key, title, body]) => <label key={key} className="flex gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50"><input type="checkbox" checked={Boolean(form[key as keyof typeof form])} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))} className="mt-1" /><span><span className="block text-sm font-semibold text-slate-900">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{body}</span></span></label>)}
        </div>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">Recommended: keep automatic blocking off initially. HR can review the audit event and mark it approved, rejected, or false positive.</p>
      </section>

      <div id="payroll-cycle-policy" className={PANEL + " space-y-5"}>
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

      <div id="leave-policy" className={PANEL + " grid grid-cols-1 gap-4 sm:grid-cols-2"}>
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
          <span className="text-xs font-semibold text-slate-600 uppercase">Monthly permission allowance</span>
          <input type="number" step="0.5" min={0} max={24} value={form.monthlyPermissionHours} onChange={(e) => setNum("monthlyPermissionHours", e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          <span className="text-xs text-slate-400">Hours per payroll cycle with no salary deduction. Example: 3 hours = 180 minutes.</span>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600 uppercase">Paid leave earned / month</span>
          <input type="number" step="0.5" min={0} max={31} value={form.monthlyPaidLeaveDays} onChange={(e) => setNum("monthlyPaidLeaveDays", e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          <span className="text-xs text-slate-400">Shared across paid leave types. Unpaid leave is not affected.</span>
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
        <div className="sm:col-span-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4" aria-labelledby="leave-eligibility-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p id="leave-eligibility-heading" className="text-sm font-semibold text-slate-900">Leave eligibility</p>
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">When active, paid leave and monthly permissions unlock after the employee completes the configured {form.probationMonths}-month eligibility period. Unpaid leave remains available for exceptional cases.</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${form.leaveEligibilityActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{form.leaveEligibilityActive ? "Active" : "Inactive"}</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby="leave-eligibility-heading">
            {[{ active: true, title: "Active", body: "Use the eligibility waiting period before paid leave opens." }, { active: false, title: "Inactive", body: "Open paid leave and monthly permissions immediately." }].map((option) => {
              const selected = form.leaveEligibilityActive === option.active;
              return <button key={option.title} type="button" role="radio" aria-checked={selected} onClick={() => setForm((p) => ({ ...p, leaveEligibilityActive: option.active, permissionRequiresProbation: option.active }))} className={`rounded-xl border p-3 text-left transition ${selected ? "border-indigo-500 bg-white ring-1 ring-indigo-500" : "border-indigo-100 bg-white/60 hover:border-indigo-300"}`}><span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-900">{option.title}</span>{selected && <Check className="h-4 w-4 text-indigo-600" aria-hidden="true" />}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{option.body}</span></button>;
            })}
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-800 sm:col-span-2">
          <input type="checkbox" checked={form.paidLeaveCarryForward} onChange={(e) => setForm((p) => ({ ...p, paidLeaveCarryForward: e.target.checked }))} className="mt-0.5" />
          <span><span className="font-semibold">Carry forward unused paid leave</span><span className="mt-1 block text-xs text-slate-400">When enabled, unused paid leave rolls into the next month. When disabled, only the current month&apos;s allowance can be used.</span></span>
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

      <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_32px_-24px_rgba(15,23,42,0.22)]" aria-labelledby="pause-deduction-heading">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-amber-500 p-2.5 text-white"><CheckCircle2 className="h-5 w-5" /></div>
          <div>
            <h2 id="pause-deduction-heading" className="text-lg font-semibold text-slate-950">Extra break & lunch salary deduction</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">The shift allowance remains free. Only completed attendance records exceeding the shift allowance plus the grace period are deducted during payroll.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-white p-4">
            <input type="checkbox" checked={form.breakDeductionEnabled} onChange={(e) => setForm((p) => ({ ...p, breakDeductionEnabled: e.target.checked }))} className="mt-1" />
            <span><span className="block text-sm font-semibold text-slate-900">Deduct extra short break</span><span className="mt-1 block text-xs leading-5 text-slate-500">Uses each employee&apos;s shift break allowance.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-white p-4">
            <input type="checkbox" checked={form.lunchDeductionEnabled} onChange={(e) => setForm((p) => ({ ...p, lunchDeductionEnabled: e.target.checked }))} className="mt-1" />
            <span><span className="block text-sm font-semibold text-slate-900">Deduct extra lunch</span><span className="mt-1 block text-xs leading-5 text-slate-500">Uses each employee&apos;s shift lunch allowance.</span></span>
          </label>
          <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Salary basis</span><Select value={form.pauseDeductionSalaryBasis} onChange={(e) => setForm((p) => ({ ...p, pauseDeductionSalaryBasis: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="BASE_SALARY">Base salary</option><option value="GROSS_SALARY">Gross salary excluding overtime</option><option value="MONTHLY_CTC">Monthly CTC</option></Select><span className="text-xs text-slate-500">Hourly rate = selected monthly amount ÷ payroll day basis ÷ 8 hours.</span></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Maximum pause deduction / day</span><input type="number" min={0} step="0.01" value={form.maxPauseDeductionPerDay} onChange={(e) => setNum("maxPauseDeductionPerDay", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><span className="text-xs text-slate-500">0 means no cap. A cap protects employees from an accidental long pause.</span></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Break grace (minutes)</span><input type="number" min={0} max={1440} value={form.breakGraceMinutes} onChange={(e) => setNum("breakGraceMinutes", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Lunch grace (minutes)</span><input type="number" min={0} max={1440} value={form.lunchGraceMinutes} onChange={(e) => setNum("lunchGraceMinutes", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Break calculation</span><Select value={form.breakDeductionMethod} onChange={(e) => setForm((p) => ({ ...p, breakDeductionMethod: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="HOURLY_RATE">Salary-based hourly rate</option><option value="FIXED_PER_MINUTE">Fixed amount per extra minute</option></Select>{form.breakDeductionMethod === "FIXED_PER_MINUTE" && <input type="number" min={0} step="0.01" value={form.breakFixedPerMinute} onChange={(e) => setNum("breakFixedPerMinute", e.target.value)} placeholder="Amount per minute" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />}</label>
          <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Lunch calculation</span><Select value={form.lunchDeductionMethod} onChange={(e) => setForm((p) => ({ ...p, lunchDeductionMethod: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="HOURLY_RATE">Salary-based hourly rate</option><option value="FIXED_PER_MINUTE">Fixed amount per extra minute</option></Select>{form.lunchDeductionMethod === "FIXED_PER_MINUTE" && <input type="number" min={0} step="0.01" value={form.lunchFixedPerMinute} onChange={(e) => setNum("lunchFixedPerMinute", e.target.value)} placeholder="Amount per minute" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />}</label>
        </div>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-white/80 p-4 text-xs leading-5 text-amber-950"><strong>Payroll rule:</strong> no deduction is created while an attendance session is still open. The final amount appears in payroll preview, payslip deductions and the employee&apos;s daily audit.</div>
      </section>

      <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_32px_-24px_rgba(15,23,42,0.22)]" aria-labelledby="shoot-policy-heading">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-violet-600 p-2.5 text-white"><CheckCircle2 className="h-5 w-5" /></div>
          <div>
            <h2 id="shoot-policy-heading" className="text-lg font-semibold text-slate-950">Shoot time, travel OT & recovery leave</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">Employees submit shoot time, travel overtime and company expenses separately after the shoot. HR approves them before payroll. Recovery leave becomes available only when the approved return journey crosses the threshold below.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Recovery leave threshold (hours)</span><input type="number" min={1} max={48} step={0.5} value={Number(form.shootRecoveryThresholdMinutes) / 60} onChange={(e) => setNum("shootRecoveryThresholdMinutes", String(Number(e.target.value || 12) * 60))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><span className="text-xs text-slate-500">Default: 12 hours. If the employee returns the next day and total travel + shoot time reaches this limit, the employee can claim a full-day recovery leave.</span></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Travel OT threshold (hours)</span><input type="number" min={1} max={48} step={0.5} value={Number(form.shootTravelOtThresholdMinutes) / 60} onChange={(e) => setNum("shootTravelOtThresholdMinutes", String(Number(e.target.value || 6) * 60))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><span className="text-xs text-slate-500">Default: 6 hours. Total travel time must reach this threshold before travel OT is calculated.</span></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Travel OT multiplier</span><input type="number" min={0} max={5} step={0.25} value={form.shootTravelOtMultiplier} onChange={(e) => setNum("shootTravelOtMultiplier", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><span className="text-xs text-slate-500">Default: 0.5. Example: 6 hours of qualifying travel is paid as 6 hours × 0.5 hourly rate.</span></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Shoot OT multiplier</span><input type="number" min={0} max={5} step={0.25} value={form.shootOtMultiplier} onChange={(e) => setNum("shootOtMultiplier", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><span className="text-xs text-slate-500">Example: 1.5 means 150% of the employee hourly rate.</span></label>
          <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-600">OT salary basis</span><Select value={form.shootOtSalaryBasis} onChange={(e) => setForm((p) => ({ ...p, shootOtSalaryBasis: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="BASE_SALARY">Base salary</option><option value="MONTHLY_CTC">Monthly CTC</option></Select><span className="text-xs text-slate-500">Hourly rate = selected monthly salary ÷ working days per month ÷ 8 hours.</span></label>
          <div className="space-y-2 text-sm text-slate-700"><label className="flex items-center gap-2"><input type="checkbox" checked={form.shootTravelOtEnabled} onChange={(e) => setForm((p) => ({ ...p, shootTravelOtEnabled: e.target.checked }))} /> Enable total-travel-time OT</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.shootRecoveryEnabled} onChange={(e) => setForm((p) => ({ ...p, shootRecoveryEnabled: e.target.checked }))} /> Enable recovery leave eligibility</label></div>
        </div>
        <div className="mt-5 rounded-2xl border border-violet-200 bg-white/80 p-4 text-xs leading-5 text-violet-950"><strong>Employee-friendly explanation:</strong> Total travel time at or above the configured threshold creates travel OT using the travel multiplier. Once the settlement is approved, that travel OT moves directly into payroll; approved food, room and transport claims move as reimbursement. Recovery Leave remains a separate eligibility option.</div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-18px_rgba(15,23,42,0.35)] backdrop-blur sm:px-8"><div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-3"><p className="hidden text-xs text-slate-500 sm:block">Changes apply to attendance and payroll after saving.</p><button type="submit" disabled={saving} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {saving ? "Saving..." : "Save policy"}</button></div></div>
    </form>
  );
}

function PolicyOverview({ form, weeklyOff }: { form: typeof DEFAULTS; weeklyOff: string }) {
  const location = form.geofenceStrict ? "Office only" : "Anywhere";
  const device = form.deviceConflictAlertEnabled ? "Duplicate alerts on" : "Duplicate alerts off";
  const pause = form.breakDeductionEnabled || form.lunchDeductionEnabled ? "Extra pause deductions on" : "Pause deductions off";
  const cycle = `${form.payrollCycleStartDay} → ${form.payrollCycleEndDay === 31 ? "last day" : form.payrollCycleEndDay}`;
  const weeklyOffLabel = weeklyOff === "0" ? "Sunday off" : `${weeklyOff.split(",").filter(Boolean).length} weekly off day(s)`;
  const cards = [
    { icon: CalendarDays, label: "Payroll cycle", value: cycle, hint: `${form.payrollDayBasis.replace(/_/g, " ")} · ${weeklyOffLabel}`, tone: "indigo" },
    { icon: MapPin, label: "Punch location", value: location, hint: form.allowWfh ? "WFH is allowed" : "WFH is off", tone: "emerald" },
    { icon: Smartphone, label: "Device security", value: device, hint: form.deviceConflictAutoBlock ? "Auto-block enabled" : "HR review workflow", tone: "violet" },
    { icon: WalletCards, label: "Break & lunch", value: pause, hint: form.pauseDeductionSalaryBasis.replace(/_/g, " "), tone: "amber" },
  ] as const;
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Policy summary">{cards.map(({ icon: Icon, label, value, hint, tone }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_32px_-24px_rgba(15,23,42,0.22)]"><div className="flex items-center gap-3"><span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tone === "indigo" ? "bg-indigo-50 text-indigo-600" : tone === "emerald" ? "bg-emerald-50 text-emerald-600" : tone === "violet" ? "bg-violet-50 text-violet-600" : "bg-amber-50 text-amber-700"}`}><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="truncate text-sm font-bold text-slate-900">{value}</p><p className="truncate text-[11px] text-slate-500">{hint}</p></div></div></div>)}</section>;
}
