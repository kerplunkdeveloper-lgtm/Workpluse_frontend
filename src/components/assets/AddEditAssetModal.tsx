"use client";

import React, { useState } from "react";


import { Box, AlertTriangle, X } from "lucide-react";
import { assetsApi } from "@/lib/api";

import { Asset, AssetCategory, AssetCondition, Employee } from "@/types";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS: MODALS & DRAWERS
// ─────────────────────────────────────────────────────────────────────────────

export function AddEditAssetModal({
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
    <Modal>
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
              <Select
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
              </Select>
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
              <Select
                value={condition}
                onChange={(e) => setCondition(e.target.value as AssetCondition)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="NEW">New (Unopened)</option>
                <option value="EXCELLENT">Excellent (Like New)</option>
                <option value="GOOD">Good (Minor wear)</option>
                <option value="FAIR">Fair (Functional)</option>
                <option value="DAMAGED">Damaged</option>
              </Select>
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
              <Select
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
              </Select>
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
    </Modal>
  );
}
