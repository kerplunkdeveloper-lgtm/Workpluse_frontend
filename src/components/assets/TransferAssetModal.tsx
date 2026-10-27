"use client";

import React, { useState } from "react";


import { AlertTriangle, ArrowRightLeft, X } from "lucide-react";
import { assetsApi } from "@/lib/api";

import { Asset, AssetCondition, Employee } from "@/types";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

export function TransferAssetModal({
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
  const [toEmployeeId, setToEmployeeId] = useState("");
  const [condition, setCondition] = useState<AssetCondition>(asset.condition);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!toEmployeeId) {
      setError("Please select the receiving employee");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await assetsApi.transfer(asset.id, {
        toEmployeeId,
        condition,
        remarks: remarks.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to transfer asset");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Transfer Asset
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

        <form onSubmit={handleTransfer} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Transferring FROM:</div>
            <div className="font-semibold text-slate-900 mt-0.5">
              {asset.assignedTo?.firstName} {asset.assignedTo?.lastName || ""} (
              {asset.assignedTo?.employeeCode})
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Transfer TO Employee <span className="text-rose-500">*</span>
            </label>
            <Select
              value={toEmployeeId}
              onChange={(e) => setToEmployeeId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">-- Choose receiving employee --</option>
              {employees
                .filter((e) => e.id !== asset.assignedToId)
                .map((emp) => (
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
              value={condition}
              onChange={(e) => setCondition(e.target.value as AssetCondition)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
            </Select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Transfer Reason & Remarks
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Project transition handover. Verified operational and assigned for Sprint 14."
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Transferring..." : "Confirm Transfer"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
