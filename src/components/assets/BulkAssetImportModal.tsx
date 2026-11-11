"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import { assetsApi } from "@/lib/api";
import { AssetCategory, Employee } from "@/types";

const HEADERS = [
  "assetCode", "name", "category", "brand", "modelNumber", "serialNumber",
  "purchaseDate", "purchaseCost", "warrantyExpiry", "condition", "employeeCode",
  "ram", "storage", "processor", "notes",
];

const TEMPLATE = [
  HEADERS.join(","),
  "LAP-00101,MacBook Pro 14,LAPTOP,Apple, A2918,C02ABC123,2026-04-01,125000,2029-04-01,NEW,EMP001,16GB,512GB SSD,M3 Pro,Issued with charger",
  ",Dell Monitor,MONITOR,Dell,P2422H,SN-0002,,,,AVAILABLE,,,,,Keep in IT storage",
].join("\n");

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(value.trim()); value = ""; }
    else value += char;
  }
  cells.push(value.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("Add at least one asset row after the header");
  const headers = parseCsvLine(lines[0]).map((item) => item.trim());
  const missing = ["name", "category", "employeeCode"].filter((item) => !headers.includes(item));
  if (missing.length) throw new Error(`Template is missing required columns: ${missing.join(", ")}`);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => { row[header] = cells[index] || ""; });
    if (row.ram || row.storage || row.processor) {
      row.specifications = JSON.stringify({ ram: row.ram, storage: row.storage, processor: row.processor });
    }
    return row;
  });
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "workpulse-asset-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function BulkAssetImportModal({
  employees,
  onClose,
  onSuccess,
}: {
  employees: Employee[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const employeeCodes = useMemo(() => new Set(employees.map((item) => item.employeeCode?.toUpperCase())), [employees]);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setRows(parseCsv(await file.text()));
    } catch (err: any) {
      setRows([]);
      setError(err.message || "Could not read the CSV file");
    }
    event.target.value = "";
  }

  const invalidRows = rows.filter((row) => !row.name?.trim() || !row.category?.trim() || !row.employeeCode?.trim() || !employeeCodes.has(row.employeeCode.trim().toUpperCase()));

  async function submit() {
    if (!rows.length) { setError("Upload the completed template first"); return; }
    if (invalidRows.length) { setError("Fix the highlighted rows before importing. Employee Code must match an active employee."); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = rows.map((row) => ({
        ...row,
        category: row.category.toUpperCase() as AssetCategory,
        employeeCode: row.employeeCode.toUpperCase(),
        purchaseCost: row.purchaseCost ? Number(row.purchaseCost) : undefined,
        specifications: row.specifications ? JSON.parse(row.specifications) : undefined,
      }));
      const result = await assetsApi.bulkCreate(payload);
      toast.success(result?.message || `${rows.length} assets imported successfully`);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Import failed. No assets were added.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal>
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5" /></div>
            <div><h2 className="text-base font-semibold text-slate-900">Bulk import assets</h2><p className="text-xs text-slate-500">Register equipment for many employees in one controlled upload</p></div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
              <p className="font-semibold text-indigo-950 mb-1">How this works</p>
              <p className="text-indigo-800/80">Download the template, fill one row per asset, and enter the employee&apos;s exact Employee Code. Every row is checked before any record is created.</p>
            </div>
            <button onClick={downloadTemplate} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"><Download className="w-4 h-4" /> Download template</button>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30">
            <Upload className="w-6 h-6 text-indigo-500" />
            <span className="font-semibold text-slate-700">Choose completed CSV file</span>
            <span className="text-slate-400">Required columns: name, category, employeeCode</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          </label>

          {error && <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>{error}</span></div>}

          {rows.length > 0 && <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200"><span className="font-semibold text-slate-800">Preview · {rows.length} row(s)</span><span className={invalidRows.length ? "text-rose-600" : "text-emerald-600"}>{invalidRows.length ? `${invalidRows.length} need attention` : <><CheckCircle2 className="inline w-3.5 h-3.5 mr-1" />Ready to import</>}</span></div>
            <div className="max-h-64 overflow-auto"><table className="w-full text-left"><thead className="bg-white sticky top-0 border-b border-slate-100"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Asset</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Employee Code</th><th className="px-3 py-2">Validation</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => { const invalid = !row.name?.trim() || !row.category?.trim() || !row.employeeCode?.trim() || !employeeCodes.has(row.employeeCode.trim().toUpperCase()); return <tr key={`${index}-${row.name}`} className={invalid ? "bg-rose-50/70" : ""}><td className="px-3 py-2 text-slate-400">{index + 2}</td><td className="px-3 py-2 font-medium text-slate-800">{row.name || "Missing name"}</td><td className="px-3 py-2 text-slate-600">{row.category || "Missing"}</td><td className="px-3 py-2 font-mono text-slate-700">{row.employeeCode || "Missing"}</td><td className={`px-3 py-2 ${invalid ? "text-rose-600" : "text-emerald-600"}`}>{invalid ? "Check required fields / employee code" : "Valid"}</td></tr>; })}</tbody></table></div>
          </div>}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200"><button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">Cancel</button><button onClick={submit} disabled={isSubmitting || !rows.length || Boolean(invalidRows.length)} className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm disabled:opacity-50">{isSubmitting ? "Importing..." : `Import ${rows.length || ""} asset${rows.length === 1 ? "" : "s"}`}</button></div>
        </div>
      </div>
    </Modal>
  );
}
