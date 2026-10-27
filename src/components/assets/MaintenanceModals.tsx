"use client";

import React, { useState } from "react";


import { CheckCircle2, Wrench, AlertTriangle, X } from "lucide-react";
import { assetsApi } from "@/lib/api";
import { todayLocalKey } from "@/lib/utils";
import { Asset, AssetCondition } from "@/types";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

export function MaintenanceModal({
  asset,
  onClose,
  onSuccess,
}: {
  asset: Asset;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [issueDescription, setIssueDescription] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [cost, setCost] = useState("");
  const [startDate, setStartDate] = useState(todayLocalKey());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogMaintenance(e: React.FormEvent) {
    e.preventDefault();
    if (!issueDescription.trim()) {
      setError("Issue description is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await assetsApi.logMaintenance(asset.id, {
        issueDescription: issueDescription.trim(),
        vendorName: vendorName.trim() || undefined,
        cost: cost ? Number(cost) : undefined,
        startDate: startDate || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to log maintenance");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Log Maintenance / Repair Ticket
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

        <form onSubmit={handleLogMaintenance} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Issue Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Battery health degraded to 68%, keyboard key sticking, OS freezing."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Vendor / Service Center
              </label>
              <input
                type="text"
                placeholder="e.g. Apple Care Authorized Service"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Estimated Cost (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 4500"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Service Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Additional Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Dispatched via courier tracking #TRK-98312"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Logging..." : "Set Under Maintenance"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function CompleteMaintenanceModal({
  asset,
  maintenanceId,
  onClose,
  onSuccess,
}: {
  asset: Asset;
  maintenanceId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [actualCost, setActualCost] = useState("");
  const [newCondition, setNewCondition] = useState<AssetCondition>("EXCELLENT");
  const [completedDate, setCompletedDate] = useState(todayLocalKey());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await assetsApi.completeMaintenance(asset.id, maintenanceId, {
        cost: actualCost ? Number(actualCost) : undefined,
        newCondition,
        completedDate,
        notes: notes.trim() || undefined,
        status: "COMPLETED",
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to complete maintenance");
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
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Complete Maintenance Ticket
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

        <form onSubmit={handleComplete} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Actual Invoiced Cost (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 4200"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Resolved Condition
              </label>
              <Select
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as AssetCondition)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Completion Date
            </label>
            <input
              type="date"
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Resolution Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Battery replaced under warranty. New OEM battery installed, diagnostics 100% passed."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {isSubmitting ? "Completing..." : "Complete & Restore"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
