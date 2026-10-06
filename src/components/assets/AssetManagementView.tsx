"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirmDialog";
import {
  Laptop,
  MonitorCheck,
  Tv,
  Smartphone,
  Tablet,
  Headphones,
  KeyRound,
  Armchair,
  CarFront,
  Box,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  UserCheck,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  Coins,
  ChevronRight,
  MoreVertical,
  ExternalLink,
  ArrowRightLeft,
  RotateCcw,
  Shield,
  Calendar,
  X,
  Copy,
  Check,
  Info,
  Edit2,
  Trash2,
  Cpu,
  HardDrive,
  Hash,
  FileText,
  DollarSign,
  User,
} from "lucide-react";
import { assetsApi, employeesApi } from "@/lib/api";
import {
  Asset,
  AssetCategory,
  AssetStatus,
  AssetCondition,
  AssetMetrics,
  Employee,
} from "@/types";

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

function getCategoryIcon(cat: AssetCategory) {
  switch (cat) {
    case "LAPTOP":
      return Laptop;
    case "DESKTOP":
      return MonitorCheck;
    case "MONITOR":
      return Tv;
    case "MOBILE_PHONE":
      return Smartphone;
    case "TABLET":
      return Tablet;
    case "HEADPHONES_PERIPHERALS":
      return Headphones;
    case "SECURITY_TOKEN_KEY":
      return KeyRound;
    case "OFFICE_FURNITURE":
      return Armchair;
    case "VEHICLE":
      return CarFront;
    default:
      return Box;
  }
}

function getStatusBadge(status: AssetStatus) {
  switch (status) {
    case "AVAILABLE":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Available",
        dot: "bg-emerald-500",
      };
    case "ASSIGNED":
      return {
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        label: "Assigned",
        dot: "bg-blue-500",
      };
    case "UNDER_MAINTENANCE":
      return {
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Under Maintenance",
        dot: "bg-amber-500 animate-pulse",
      };
    case "DAMAGED":
      return {
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        label: "Damaged",
        dot: "bg-rose-500",
      };
    case "RETIRED":
      return {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        label: "Retired",
        dot: "bg-gray-500",
      };
    case "LOST":
      return {
        bg: "bg-purple-50 text-purple-700 border-purple-200",
        label: "Lost",
        dot: "bg-purple-500",
      };
    default:
      return {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        label: status,
        dot: "bg-gray-400",
      };
  }
}

function getConditionBadge(condition: AssetCondition) {
  switch (condition) {
    case "NEW":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "EXCELLENT":
      return "bg-teal-50 text-teal-700 border-teal-200";
    case "GOOD":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "FAIR":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "DAMAGED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

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
        const res = await employeesApi.getAll();
        if (res?.success && Array.isArray(res.data)) {
          setEmployees(res.data.filter((e: Employee) => e.status === "ACTIVE"));
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
                Asset Inventory & Lifecycle
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
          <select
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
          </select>

          <select
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
          </select>
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

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS: MODALS & DRAWERS
// ─────────────────────────────────────────────────────────────────────────────

function AddEditAssetModal({
  asset,
  employees,
  onClose,
  onSuccess,
}: {
  asset: Asset | null;
  employees: Employee[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(asset);
  const [name, setName] = useState(asset?.name || "");
  const [category, setCategory] = useState<AssetCategory>(asset?.category || "LAPTOP");
  const [assetCode, setAssetCode] = useState(asset?.assetCode || "");
  const [brand, setBrand] = useState(asset?.brand || "");
  const [modelNumber, setModelNumber] = useState(asset?.modelNumber || "");
  const [serialNumber, setSerialNumber] = useState(asset?.serialNumber || "");
  const [purchaseDate, setPurchaseDate] = useState(
    asset?.purchaseDate ? asset.purchaseDate.split("T")[0] : ""
  );
  const [purchaseCost, setPurchaseCost] = useState(
    asset?.purchaseCost ? String(asset.purchaseCost) : ""
  );
  const [warrantyExpiry, setWarrantyExpiry] = useState(
    asset?.warrantyExpiry ? asset.warrantyExpiry.split("T")[0] : ""
  );
  const [condition, setCondition] = useState<AssetCondition>(asset?.condition || "NEW");
  const [assignedToId, setAssignedToId] = useState(asset?.assignedToId || "");
  const [ram, setRam] = useState(asset?.specifications?.ram || "");
  const [storage, setStorage] = useState(asset?.specifications?.storage || "");
  const [processor, setProcessor] = useState(asset?.specifications?.processor || "");
  const [notes, setNotes] = useState(asset?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Asset name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const specs: Record<string, string> = {};
    if (ram.trim()) specs.ram = ram.trim();
    if (storage.trim()) specs.storage = storage.trim();
    if (processor.trim()) specs.processor = processor.trim();

    try {
      if (isEdit && asset) {
        await assetsApi.update(asset.id, {
          name,
          category,
          brand: brand.trim() || null,
          modelNumber: modelNumber.trim() || null,
          serialNumber: serialNumber.trim() || null,
          purchaseDate: purchaseDate || null,
          purchaseCost: purchaseCost ? Number(purchaseCost) : null,
          warrantyExpiry: warrantyExpiry || null,
          condition,
          specifications: Object.keys(specs).length > 0 ? specs : null,
          notes: notes.trim() || null,
        });
      } else {
        await assetsApi.create({
          assetCode: assetCode.trim() || undefined,
          name,
          category,
          brand: brand.trim() || null,
          modelNumber: modelNumber.trim() || null,
          serialNumber: serialNumber.trim() || null,
          purchaseDate: purchaseDate || null,
          purchaseCost: purchaseCost ? Number(purchaseCost) : null,
          warrantyExpiry: warrantyExpiry || null,
          condition,
          specifications: Object.keys(specs).length > 0 ? specs : null,
          notes: notes.trim() || null,
          assignedToId: assignedToId || undefined,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save asset");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Box className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? `Edit Asset: ${asset?.assetCode}` : "Register New Equipment"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Asset Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. MacBook Pro 16 M3 Max"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="LAPTOP">Laptop</option>
                <option value="DESKTOP">Desktop Computer</option>
                <option value="MONITOR">External Monitor</option>
                <option value="MOBILE_PHONE">Mobile Phone</option>
                <option value="TABLET">Tablet</option>
                <option value="HEADPHONES_PERIPHERALS">Headphones & Peripherals</option>
                <option value="SECURITY_TOKEN_KEY">Security Token / Key</option>
                <option value="OFFICE_FURNITURE">Office Furniture</option>
                <option value="VEHICLE">Company Vehicle</option>
                <option value="OTHER">Other Equipment</option>
              </select>
            </div>
          </div>

          {/* Row 2: Asset Code (optional custom) & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Asset Code (Unique ID)
              </label>
              <input
                type="text"
                placeholder={isEdit ? asset?.assetCode : "Auto-generated (e.g. LAP-00101)"}
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value.toUpperCase())}
                disabled={isEdit}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono disabled:opacity-60"
              />
              {!isEdit && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Leave blank to auto-generate sequentially.
                </p>
              )}
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Brand / Manufacturer
              </label>
              <input
                type="text"
                placeholder="e.g. Apple, Dell, Lenovo, HP"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 3: Model & Serial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Model Number
              </label>
              <input
                type="text"
                placeholder="e.g. A2991 / XPS 15 9530"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                placeholder="e.g. C02G1234MD6R"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Row 4: Purchase Cost, Purchase Date & Warranty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Purchase Cost (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 185000"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Warranty Expiry
              </label>
              <input
                type="date"
                value={warrantyExpiry}
                onChange={(e) => setWarrantyExpiry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 5: Condition & Hardware Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as AssetCondition)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="NEW">New (Unopened)</option>
                <option value="EXCELLENT">Excellent (Like New)</option>
                <option value="GOOD">Good (Minor wear)</option>
                <option value="FAIR">Fair (Functional)</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                RAM / Memory
              </label>
              <input
                type="text"
                placeholder="e.g. 32GB"
                value={ram}
                onChange={(e) => setRam(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Storage
              </label>
              <input
                type="text"
                placeholder="e.g. 1TB SSD"
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                CPU / Chip
              </label>
              <input
                type="text"
                placeholder="e.g. M3 Max / i9"
                value={processor}
                onChange={(e) => setProcessor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Initial Assignee (Only on Create) */}
          {!isEdit && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Assign Immediately to Employee (Optional)
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Keep in inventory (Unassigned)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName || ""} ({emp.employeeCode})
                    {emp.department?.name ? ` — ${emp.department.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Internal Notes / Asset Location
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Purchased via Apple Store, invoice #INV-982. Kept on IT Bay 4."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Update Asset" : "Create Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignAssetModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
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
            <select
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
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Handover Condition
            </label>
            <select
              value={conditionOnAssign}
              onChange={(e) => setConditionOnAssign(e.target.value as AssetCondition)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="NEW">New</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
            </select>
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
    </div>
  );
}

function ReturnAssetModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
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
            <select
              value={conditionOnReturn}
              onChange={(e) => setConditionOnReturn(e.target.value as AssetCondition)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="EXCELLENT">Excellent (Like New)</option>
              <option value="GOOD">Good (Normal Wear)</option>
              <option value="FAIR">Fair (Minor scratches / cosmetic)</option>
              <option value="DAMAGED">Damaged (Broken screen / physical damage)</option>
            </select>
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
    </div>
  );
}

function TransferAssetModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
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
            <select
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
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Handover Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as AssetCondition)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
            </select>
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
    </div>
  );
}

function MaintenanceModal({
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
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
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
    </div>
  );
}

function CompleteMaintenanceModal({
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
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split("T")[0]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
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
              <select
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as AssetCondition)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
              </select>
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
    </div>
  );
}

function AssetDetailDrawer({
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
