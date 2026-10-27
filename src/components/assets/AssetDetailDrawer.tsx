"use client";

import React, { useState } from "react";


import { Laptop, RefreshCw, X, Trash2 } from "lucide-react";


import { Asset } from "@/types";


import { getStatusBadge, getConditionBadge } from "./assetUi";

export function AssetDetailDrawer({
  asset,
  isLoading,
  onClose,
  onRefresh,
  onAssign,
  onReturn,
  onDelete,
}: {
  asset: Asset | null;
  isLoading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onAssign: () => void;
  onReturn: () => void;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"HISTORY" | "MAINTENANCE" | "SPECS">("HISTORY");

  if (!asset && !isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm animate-in fade-in flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/50">
                  {asset?.assetCode}
                </span>
                {asset && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                      getStatusBadge(asset.status).bg
                    }`}
                  >
                    {getStatusBadge(asset.status).label}
                  </span>
                )}
              </div>
              <h2 className="text-base font-semibold text-slate-900 mt-1">
                {asset?.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading || !asset ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Quick Status Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Current Custody</span>
                <span className="text-xs font-semibold text-slate-900">
                  {asset.assignedTo
                    ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName || ""} (${asset.assignedTo.employeeCode})`
                    : "In Inventory"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Condition</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium border ${getConditionBadge(
                    asset.condition
                  )}`}
                >
                  {asset.condition}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Serial Number</span>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {asset.serialNumber || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Purchase Cost</span>
                <span className="text-xs font-semibold text-slate-900">
                  {asset.purchaseCost
                    ? `₹${Number(asset.purchaseCost).toLocaleString("en-IN")}`
                    : "—"}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab("HISTORY")}
                className={`pb-2.5 px-1 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === "HISTORY"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Custody Timeline ({asset.assignments?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("MAINTENANCE")}
                className={`pb-2.5 px-1 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === "MAINTENANCE"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Maintenance Log ({asset.maintenances?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("SPECS")}
                className={`pb-2.5 px-1 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === "SPECS"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Specifications & Notes
              </button>
            </div>

            {/* Tab 1: Custody History */}
            {activeTab === "HISTORY" && (
              <div className="space-y-4">
                {!asset.assignments || asset.assignments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No custody changes recorded yet.
                  </p>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {asset.assignments.map((record) => {
                      const isAssign = record.type === "ASSIGNMENT";
                      const isReturn = record.type === "RETURN";
                      const isTransfer = record.type === "TRANSFER";

                      return (
                        <div key={record.id} className="relative">
                          {/* Dot */}
                          <div
                            className={`absolute -left-[27px] top-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              isAssign
                                ? "bg-blue-500"
                                : isReturn
                                ? "bg-emerald-500"
                                : "bg-purple-500"
                            }`}
                          />

                          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`font-semibold uppercase text-xs tracking-wider ${
                                  isAssign
                                    ? "text-blue-600"
                                    : isReturn
                                    ? "text-emerald-600"
                                    : "text-purple-600"
                                }`}
                              >
                                {record.type}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(record.assignedDate || record.createdAt).toLocaleString()}
                              </span>
                            </div>

                            {record.employee && (
                              <div className="font-medium text-slate-900">
                                {isReturn ? "Returned by: " : isTransfer ? "Transferred to: " : "Assigned to: "}
                                {record.employee.firstName} {record.employee.lastName || ""} (
                                {record.employee.employeeCode})
                              </div>
                            )}

                            {record.conditionOnReturn && (
                              <div className="text-xs text-slate-500 mt-1">
                                Return Condition:{" "}
                                <span className="font-semibold text-slate-700">
                                  {record.conditionOnReturn}
                                </span>
                              </div>
                            )}

                            {record.recoveryCharge && Number(record.recoveryCharge) > 0 && (
                              <div className="mt-1 text-rose-600 font-medium">
                                Damage recovery charged: ₹{Number(record.recoveryCharge).toLocaleString("en-IN")}
                              </div>
                            )}

                            {record.remarks && (
                              <div className="mt-2 text-slate-600 text-xs bg-slate-50 p-2 rounded-lg italic">
                                "{record.remarks}"
                              </div>
                            )}

                            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                              <span>Action by: {record.assignedBy || record.returnedTo || "Admin"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Maintenance Log */}
            {activeTab === "MAINTENANCE" && (
              <div className="space-y-3">
                {!asset.maintenances || asset.maintenances.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No maintenance records logged for this asset.
                  </p>
                ) : (
                  asset.maintenances.map((maint) => (
                    <div
                      key={maint.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            maint.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {maint.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          Started: {new Date(maint.startDate).toLocaleDateString()}
                          {maint.completedDate
                            ? ` • Completed: ${new Date(maint.completedDate).toLocaleDateString()}`
                            : ""}
                        </span>
                      </div>

                      <div className="font-semibold text-slate-900">
                        {maint.issueDescription}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div>
                          Vendor: <span className="font-medium text-slate-700">{maint.vendorName || "—"}</span>
                        </div>
                        <div>
                          Cost: <span className="font-medium text-slate-700">{maint.cost ? `₹${maint.cost}` : "—"}</span>
                        </div>
                      </div>

                      {maint.notes && (
                        <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600">
                          {maint.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Specs & Notes */}
            {activeTab === "SPECS" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-400">Brand</span>
                    <div className="font-medium text-slate-900">{asset.brand || "—"}</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Model</span>
                    <div className="font-medium text-slate-900">{asset.modelNumber || "—"}</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Purchase Date</span>
                    <div className="font-medium text-slate-900">
                      {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Warranty Expiry</span>
                    <div className="font-medium text-slate-900">
                      {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : "—"}
                    </div>
                  </div>
                </div>

                {asset.specifications && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Hardware Specifications
                    </span>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {typeof asset.specifications === "object" ? (
                        Object.entries(asset.specifications).map(([key, val]) => (
                          <div key={key}>
                            <span className="text-xs text-slate-400 uppercase">{key}</span>
                            <div className="font-mono text-xs font-semibold text-slate-800">
                              {String(val)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="font-mono">{String(asset.specifications)}</div>
                      )}
                    </div>
                  </div>
                )}

                {asset.notes && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Notes
                    </span>
                    <p className="text-slate-700">{asset.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {asset && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2">
            <button
              onClick={onDelete}
              disabled={asset.status === "ASSIGNED"}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
              title={asset.status === "ASSIGNED" ? "Cannot delete assigned asset" : "Delete Asset"}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              {asset.status === "AVAILABLE" && (
                <button
                  onClick={() => {
                    onClose();
                    onAssign();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                >
                  Assign Asset
                </button>
              )}
              {asset.status === "ASSIGNED" && (
                <button
                  onClick={() => {
                    onClose();
                    onReturn();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
                >
                  Return to Inventory
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
