"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { Laptop, MonitorCheck, Tv, Smartphone, Tablet, Headphones, KeyRound, Armchair, CarFront, Box, Plus, Search, RefreshCw, UserCheck, CheckCircle2, Wrench, AlertTriangle, Coins, ArrowRightLeft, Copy, Check, Info, Edit2 } from "lucide-react";
import { assetsApi, employeesApi } from "@/lib/api";

import { Asset, AssetCategory, AssetMetrics, Employee } from "@/types";
import Select from "@/components/ui/Select";

import { getCategoryIcon, getStatusBadge, getConditionBadge } from "./assetUi";
import { AddEditAssetModal } from "./AddEditAssetModal";
import { AssignAssetModal } from "./AssignAssetModal";
import { ReturnAssetModal } from "./ReturnAssetModal";
import { TransferAssetModal } from "./TransferAssetModal";
import { MaintenanceModal, CompleteMaintenanceModal } from "./MaintenanceModals";
import { AssetDetailDrawer } from "./AssetDetailDrawer";

const CATEGORIES: { id: AssetCategory | "ALL"; label: string; icon: React.ElementType }[] = [
  { id: "ALL", label: "All Assets", icon: Box },
  { id: "LAPTOP", label: "Laptops", icon: Laptop },
  { id: "DESKTOP", label: "Desktops", icon: MonitorCheck },
  { id: "MONITOR", label: "Monitors", icon: Tv },
  { id: "MOBILE_PHONE", label: "Phones", icon: Smartphone },
  { id: "TABLET", label: "Tablets", icon: Tablet },
  { id: "HEADPHONES_PERIPHERALS", label: "Peripherals", icon: Headphones },
  { id: "SECURITY_TOKEN_KEY", label: "Security Keys", icon: KeyRound },
  { id: "OFFICE_FURNITURE", label: "Furniture", icon: Armchair },
  { id: "VEHICLE", label: "Vehicles", icon: CarFront },
  { id: "OTHER", label: "Other", icon: Box },
];

export default function AssetManagementView() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [metrics, setMetrics] = useState<AssetMetrics | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCondition, setSelectedCondition] = useState<string>("ALL");

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assignModalAsset, setAssignModalAsset] = useState<Asset | null>(null);
  const [returnModalAsset, setReturnModalAsset] = useState<Asset | null>(null);
  const [transferModalAsset, setTransferModalAsset] = useState<Asset | null>(null);
  const [maintenanceModalAsset, setMaintenanceModalAsset] = useState<Asset | null>(null);
  const [completeMaintModal, setCompleteMaintModal] = useState<{ asset: Asset; maintenanceId: string } | null>(null);
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Copied alert
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load Assets
  async function loadData() {
    setIsLoading(true);
    try {
      const res = await assetsApi.getAll({
        category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        condition: selectedCondition !== "ALL" ? selectedCondition : undefined,
        search: search.trim() || undefined,
      });

      if (res?.success && res.data) {
        setAssets(res.data.assets || []);
        setMetrics(res.data.metrics || null);
      }
    } catch (err) {
      console.error("Failed to load assets", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Load Employees for assign/transfer dropdowns
  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await employeesApi.getAll({ page: 1, limit: 500, status: "WORKING" });
        if (res?.success && Array.isArray(res.data)) {
          setEmployees(res.data);
        }
      } catch (err) {
        console.error("Failed to load employees", err);
      }
    }
    fetchEmployees();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timeout);
  }, [selectedCategory, selectedStatus, selectedCondition, search]);

  // Load Detail Asset for Drawer
  async function openDetail(assetId: string) {
    setDetailAssetId(assetId);
    setIsDetailLoading(true);
    try {
      const res = await assetsApi.getById(assetId);
      if (res?.success && res.data) {
        setDetailAsset(res.data);
      }
    } catch (err) {
      console.error("Failed to load asset details", err);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-slate-900 tracking-tight">
                Assets
              </h1>
              <p className="text-sm text-slate-500">
                Track hardware equipment, serial numbers, employee custody, warranty & offboarding returns
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setEditingAsset(null);
              setIsAddModalOpen(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-all hover:shadow-md hover:shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Total Assets</span>
            <Box className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics?.totalAssets ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">In organizational database</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200/60 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 text-xs font-medium uppercase tracking-wider">
            <span>Assigned</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600">
            {metrics?.assignedCount ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">With active employees</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/60 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-medium uppercase tracking-wider">
            <span>Available</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {metrics?.availableCount ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">In storage / ready to assign</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 text-xs font-medium uppercase tracking-wider">
            <span>Maintenance</span>
            <Wrench className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {metrics?.underMaintenanceCount ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">Under repair or servicing</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200/60 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 text-xs font-medium uppercase tracking-wider">
            <span>Damaged</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {metrics?.damagedCount ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">Needs assessment / write-off</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200/60 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 text-xs font-medium uppercase tracking-wider">
            <span>Book Value</span>
            <Coins className="w-4 h-4" />
          </div>
          <div className="mt-2 text-xl font-bold text-purple-600 truncate">
            ₹{(metrics?.totalAssetValue ?? 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-xs text-slate-400">Total recorded cost</div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Asset ID (LAP-00124), Serial #, Model, Brand, or Assignee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="DAMAGED">Damaged</option>
            <option value="RETIRED">Retired</option>
          </Select>

          <Select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Conditions</option>
            <option value="NEW">New</option>
            <option value="EXCELLENT">Excellent</option>
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
            <option value="DAMAGED">Damaged</option>
          </Select>
        </div>
      </div>

      {/* Assets Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading asset inventory...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-16 text-center">
            <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">
              No assets found
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search || selectedCategory !== "ALL" || selectedStatus !== "ALL"
                ? "Try adjusting your search query or filters to find what you're looking for."
                : "Your organization doesn't have any assets recorded yet. Click 'Add Asset' to start tracking hardware."}
            </p>
            {(!search && selectedCategory === "ALL" && selectedStatus === "ALL") && (
              <button
                onClick={() => {
                  setEditingAsset(null);
                  setIsAddModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Asset</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Asset Code & Item</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Serial / Model</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Condition</th>
                  <th className="px-4 py-3.5">Current Custody</th>
                  <th className="px-4 py-3.5">Cost & Warranty</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((asset) => {
                  const CategoryIcon = getCategoryIcon(asset.category);
                  const statusBadge = getStatusBadge(asset.status);
                  const isWarrantyExpired =
                    asset.warrantyExpiry && new Date(asset.warrantyExpiry) < new Date();

                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Asset Code & Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 border border-indigo-100">
                            <CategoryIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded text-xs border border-indigo-200/50">
                                {asset.assetCode}
                              </span>
                              <button
                                onClick={() => handleCopy(asset.assetCode)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                title="Copy Asset Code"
                              >
                                {copiedCode === asset.assetCode ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </button>
                            </div>
                            <div className="font-semibold text-slate-900 mt-0.5">
                              {asset.name}
                            </div>
                            {asset.brand && (
                              <div className="text-xs text-slate-400">
                                {asset.brand} {asset.modelNumber ? `• ${asset.modelNumber}` : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {asset.category.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Serial / Model */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-slate-700 text-xs">
                          {asset.serialNumber || "—"}
                        </div>
                        {asset.specifications && (
                          <div className="text-xs text-slate-400 truncate max-w-[150px]">
                            {typeof asset.specifications === "object"
                              ? Object.entries(asset.specifications)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(", ")
                              : String(asset.specifications)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Condition */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getConditionBadge(
                            asset.condition
                          )}`}
                        >
                          {asset.condition}
                        </span>
                      </td>

                      {/* Custody */}
                      <td className="px-4 py-3.5">
                        {asset.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {asset.assignedTo.firstName[0]}
                              {asset.assignedTo.lastName?.[0] || ""}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">
                                {asset.assignedTo.firstName} {asset.assignedTo.lastName || ""}
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                {asset.assignedTo.employeeCode}{" "}
                                {asset.assignedTo.department?.name ? `• ${asset.assignedTo.department.name}` : ""}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            In Inventory (Unassigned)
                          </span>
                        )}
                      </td>

                      {/* Cost & Warranty */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900">
                          {asset.purchaseCost ? `₹${Number(asset.purchaseCost).toLocaleString("en-IN")}` : "—"}
                        </div>
                        {asset.warrantyExpiry && (
                          <div
                            className={`text-xs ${
                              isWarrantyExpired
                                ? "text-rose-500 font-medium"
                                : "text-slate-400"
                            }`}
                          >
                            Warranty: {new Date(asset.warrantyExpiry).toLocaleDateString()}
                            {isWarrantyExpired ? " (Expired)" : ""}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Lifecycle Actions */}
                          {asset.status === "AVAILABLE" && (
                            <button
                              onClick={() => setAssignModalAsset(asset)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium transition-colors"
                              title="Assign to Employee"
                            >
                              Assign
                            </button>
                          )}

                          {asset.status === "ASSIGNED" && (
                            <>
                              <button
                                onClick={() => setReturnModalAsset(asset)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-medium transition-colors"
                                title="Return to Store"
                              >
                                Return
                              </button>
                              <button
                                onClick={() => setTransferModalAsset(asset)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                                title="Transfer to Colleague"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {asset.status === "UNDER_MAINTENANCE" && (
                            <button
                              onClick={() => {
                                const activeMaint = asset.maintenances?.find(
                                  (m) => m.status === "IN_PROGRESS"
                                );
                                setCompleteMaintModal({
                                  asset,
                                  maintenanceId: activeMaint?.id || "",
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium transition-colors"
                              title="Complete Maintenance"
                            >
                              Resolve
                            </button>
                          )}

                          {asset.status !== "UNDER_MAINTENANCE" && (
                            <button
                              onClick={() => setMaintenanceModalAsset(asset)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                              title="Log Maintenance / Repair"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => openDetail(asset.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="View History & Details"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingAsset(asset);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                            title="Edit Asset Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Asset Modal ────────────────────────────────────────── */}
      {isAddModalOpen && (
        <AddEditAssetModal
          asset={editingAsset}
          employees={employees}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingAsset(null);
          }}
          onSuccess={() => {
            setIsAddModalOpen(false);
            setEditingAsset(null);
            loadData();
          }}
        />
      )}

      {/* ── Assign Asset Modal ───────────────────────────────────────────── */}
      {assignModalAsset && (
        <AssignAssetModal
          asset={assignModalAsset}
          employees={employees}
          onClose={() => setAssignModalAsset(null)}
          onSuccess={() => {
            setAssignModalAsset(null);
            loadData();
          }}
        />
      )}

      {/* ── Return Asset Modal ───────────────────────────────────────────── */}
      {returnModalAsset && (
        <ReturnAssetModal
          asset={returnModalAsset}
          onClose={() => setReturnModalAsset(null)}
          onSuccess={() => {
            setReturnModalAsset(null);
            loadData();
          }}
        />
      )}

      {/* ── Transfer Asset Modal ─────────────────────────────────────────── */}
      {transferModalAsset && (
        <TransferAssetModal
          asset={transferModalAsset}
          employees={employees}
          onClose={() => setTransferModalAsset(null)}
          onSuccess={() => {
            setTransferModalAsset(null);
            loadData();
          }}
        />
      )}

      {/* ── Maintenance Modal ────────────────────────────────────────────── */}
      {maintenanceModalAsset && (
        <MaintenanceModal
          asset={maintenanceModalAsset}
          onClose={() => setMaintenanceModalAsset(null)}
          onSuccess={() => {
            setMaintenanceModalAsset(null);
            loadData();
          }}
        />
      )}

      {/* ── Complete Maintenance Modal ───────────────────────────────────── */}
      {completeMaintModal && (
        <CompleteMaintenanceModal
          asset={completeMaintModal.asset}
          maintenanceId={completeMaintModal.maintenanceId}
          onClose={() => setCompleteMaintModal(null)}
          onSuccess={() => {
            setCompleteMaintModal(null);
            loadData();
          }}
        />
      )}

      {/* ── Asset Detail & History Drawer ─────────────────────────────────── */}
      {detailAssetId && (
        <AssetDetailDrawer
          asset={detailAsset}
          isLoading={isDetailLoading}
          onClose={() => {
            setDetailAssetId(null);
            setDetailAsset(null);
          }}
          onRefresh={() => openDetail(detailAssetId)}
          onAssign={() => {
            if (detailAsset) setAssignModalAsset(detailAsset);
          }}
          onReturn={() => {
            if (detailAsset) setReturnModalAsset(detailAsset);
          }}
          onDelete={async () => {
            if (detailAsset) {
              if (await confirmDialog({ title: `Delete asset ${detailAsset.assetCode}?`, message: "This removes the asset record. It cannot be undone.", confirmLabel: "Delete asset" })) {
                try {
                  await assetsApi.delete(detailAsset.id);
                  setDetailAssetId(null);
                  setDetailAsset(null);
                  loadData();
                } catch (err: any) {
                  toast.error(err.response?.data?.message || "Failed to delete asset");
                }
              }
            }
          }}
        />
      )}
    </div>
  );
}
