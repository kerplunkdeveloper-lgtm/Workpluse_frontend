"use client";

import React, { useState } from "react";


import { UserCheck, AlertTriangle, X } from "lucide-react";
import { assetsApi } from "@/lib/api";

import { Asset, AssetCondition, Employee } from "@/types";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

export function AssignAssetModal({
  asset,
  employees,
  onClose,
  onSuccess,
}: {
  asset: Asset;
  employees: Employee[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [conditionOnAssign, setConditionOnAssign] = useState<AssetCondition>(asset.condition);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) {
      setError("Please select an employee");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await assetsApi.assign(asset.id, {
        employeeId,
        conditionOnAssign,
        remarks: remarks.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to assign asset");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Assign Asset to Employee
              </h2>
              <p className="text-xs text-slate-400">
                {asset.assetCode} • {asset.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleAssign} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Select Employee <span className="text-rose-500">*</span>
            </label>
            <Select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">-- Choose active employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName || ""} ({emp.employeeCode})
                  {emp.department?.name ? ` — ${emp.department.name}` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Handover Condition
            </label>
            <Select
              value={conditionOnAssign}
              onChange={(e) => setConditionOnAssign(e.target.value as AssetCondition)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="NEW">New</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
            </Select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Handover Remarks / Serial Verification
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Handed over with original 140W USB-C power adapter and braided cable. Physical condition verified clean."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Assigning..." : "Confirm Assignment"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
