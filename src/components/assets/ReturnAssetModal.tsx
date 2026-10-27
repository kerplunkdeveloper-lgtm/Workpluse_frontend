"use client";

import React, { useState } from "react";


import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { assetsApi } from "@/lib/api";

import { Asset, AssetCondition } from "@/types";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

export function ReturnAssetModal({
  asset,
  onClose,
  onSuccess,
}: {
  asset: Asset;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [conditionOnReturn, setConditionOnReturn] = useState<AssetCondition>("GOOD");
  const [recoveryCharge, setRecoveryCharge] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await assetsApi.return(asset.id, {
        conditionOnReturn,
        recoveryCharge: recoveryCharge ? Number(recoveryCharge) : 0,
        remarks: remarks.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to return asset");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Return Asset to Inventory
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

        <form onSubmit={handleReturn} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Currently assigned to:</div>
            <div className="font-semibold text-slate-900 mt-0.5 text-sm">
              {asset.assignedTo?.firstName} {asset.assignedTo?.lastName || ""} (
              {asset.assignedTo?.employeeCode})
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Condition on Return <span className="text-rose-500">*</span>
            </label>
            <Select
              value={conditionOnReturn}
              onChange={(e) => setConditionOnReturn(e.target.value as AssetCondition)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="EXCELLENT">Excellent (Like New)</option>
              <option value="GOOD">Good (Normal Wear)</option>
              <option value="FAIR">Fair (Minor scratches / cosmetic)</option>
              <option value="DAMAGED">Damaged (Broken screen / physical damage)</option>
            </Select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Damage / Loss Recovery Charge (₹)
            </label>
            <input
              type="number"
              placeholder="0 (Enter amount if employee is liable for repair/replacement)"
              value={recoveryCharge}
              onChange={(e) => setRecoveryCharge(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              💡 Synergized with Offboarding: If this employee is in exit notice, any recovery amount will automatically be linked to their IT Asset Clearance and deducted from their Full & Final (F&F) Settlement.
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Return Inspection Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Laptop checked, booted to login screen, screen clean, charger and bag received."
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Returning..." : "Accept Return"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
