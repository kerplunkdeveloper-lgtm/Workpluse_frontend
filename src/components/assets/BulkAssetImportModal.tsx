"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import ExcelJS from "exceljs";
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

const CATEGORY_ALIASES: Record<string, AssetCategory> = { LAPTOP: "LAPTOP", "LAPTOP COMPUTER": "LAPTOP", DESKTOP: "DESKTOP", "DESKTOP COMPUTER": "DESKTOP", MONITOR: "MONITOR", "EXTERNAL MONITOR": "MONITOR", "MOBILE PHONE": "MOBILE_PHONE", MOBILE_PHONE: "MOBILE_PHONE", TABLET: "TABLET", "HEADPHONES & PERIPHERALS": "HEADPHONES_PERIPHERALS", HEADPHONES_PERIPHERALS: "HEADPHONES_PERIPHERALS", "SECURITY TOKEN / KEY": "SECURITY_TOKEN_KEY", SECURITY_TOKEN_KEY: "SECURITY_TOKEN_KEY", "OFFICE FURNITURE": "OFFICE_FURNITURE", "COMPANY VEHICLE": "VEHICLE", VEHICLE: "VEHICLE", "OTHER EQUIPMENT": "OTHER", OTHER: "OTHER" };
const CONDITION_ALIASES: Record<string, string> = { NEW: "NEW", "NEW (UNOPENED)": "NEW", EXCELLENT: "EXCELLENT", "EXCELLENT (LIKE NEW)": "EXCELLENT", GOOD: "GOOD", "GOOD (MINOR WEAR)": "GOOD", FAIR: "FAIR", "FAIR (FUNCTIONAL)": "FAIR", DAMAGED: "DAMAGED" };
const HEADER_ALIASES: Record<string, string> = { "ASSET NAME": "name", "ASSET NAME *": "name", "ASSET CODE (UNIQUE ID)": "assetCode", "BRAND / MANUFACTURER": "brand", "MODEL NUMBER": "modelNumber", "SERIAL NUMBER": "serialNumber", "PURCHASE COST (₹)": "purchaseCost", "PURCHASE COST": "purchaseCost", "PURCHASE DATE": "purchaseDate", "WARRANTY EXPIRY": "warrantyExpiry", CONDITION: "condition", "EMPLOYEE CODE (OPTIONAL)": "employeeCode", "INTERNAL NOTES / ASSET LOCATION": "notes", "RAM / MEMORY": "ram", STORAGE: "storage", "CPU / CHIP": "processor" };
const canonicalHeader = (value: string) => HEADER_ALIASES[value.trim().replace(/\s+/g, " ").toUpperCase()] || value.trim();
const normalizeRow = (row: Record<string, string>) => ({ ...row, category: CATEGORY_ALIASES[String(row.category || "").trim().toUpperCase()] || String(row.category || "").trim().toUpperCase(), condition: CONDITION_ALIASES[String(row.condition || "NEW").trim().toUpperCase()] || String(row.condition || "").trim().toUpperCase(), employeeCode: String(row.employeeCode || "").trim().toUpperCase(), assetCode: String(row.assetCode || "").trim().toUpperCase() });

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
  const headers = parseCsvLine(lines[0]).map(canonicalHeader);
  const missing = ["name", "category"].filter((item) => !headers.includes(item));
  if (missing.length) throw new Error(`Template is missing required columns: ${missing.join(", ")}`);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => { row[header] = cells[index] || ""; });
    if (row.ram || row.storage || row.processor) {
      row.specifications = JSON.stringify({ ram: row.ram, storage: row.storage, processor: row.processor });
    }
    return normalizeRow(row);
  });
}

async function parseExcel(file: File) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The Excel file has no worksheet");
  const values = sheet.getRow(1).values as Array<unknown>;
  const headers = values.slice(1).map((value) => canonicalHeader(String(value || "")));
  const missing = ["name", "category"].filter((item) => !headers.includes(item));
  if (missing.length) throw new Error(`Template is missing required columns: ${missing.join(", ")}`);
  const output: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells = row.values as Array<unknown>;
    const parsed: Record<string, string> = {};
    headers.forEach((header, index) => { parsed[header] = String(cells[index + 1] ?? "").trim(); });
    if (Object.values(parsed).some(Boolean)) output.push(normalizeRow(parsed));
  });
  if (!output.length) throw new Error("Add at least one asset row after the header");
  return output;
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "clocked-asset-import-template.csv";
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
      setRows(file.name.toLowerCase().endsWith(".xlsx") ? await parseExcel(file) : parseCsv(await file.text()));
    } catch (err: any) {
      setRows([]);
      setError(err.message || "Could not read the CSV file");
    }
    event.target.value = "";
  }

  const duplicateAssetCodes = useMemo(() => {
    const codes = rows.map((row) => row.assetCode?.trim()).filter(Boolean);
    return new Set(codes.filter((code, index) => codes.indexOf(code) !== index));
  }, [rows]);

  const invalidRows = rows.filter((row) => {
    const employeeCode = row.employeeCode?.trim();
    const cost = row.purchaseCost?.trim();
    return !row.name?.trim() || !CATEGORY_ALIASES[row.category?.trim().toUpperCase()] || !CONDITION_ALIASES[row.condition?.trim().toUpperCase()] || (employeeCode && !employeeCodes.has(employeeCode.toUpperCase())) || Boolean(cost && (!Number.isFinite(Number(cost)) || Number(cost) < 0)) || Boolean(row.purchaseDate?.trim() && Number.isNaN(Date.parse(row.purchaseDate))) || Boolean(row.warrantyExpiry?.trim() && Number.isNaN(Date.parse(row.warrantyExpiry))) || Boolean(row.assetCode?.trim() && duplicateAssetCodes.has(row.assetCode.trim().toUpperCase()));
  });

  async function submit() {
    if (!rows.length) { setError("Upload the completed template first"); return; }
    if (invalidRows.length) { setError("Fix the highlighted rows before importing. Check name, category, condition, dates, cost, duplicate asset codes, and employee codes."); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = rows.map((row) => ({
        ...row,
        category: CATEGORY_ALIASES[row.category.toUpperCase()] as AssetCategory,
        condition: CONDITION_ALIASES[row.condition.toUpperCase()] as any,
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
            <span className="font-semibold text-slate-700">Choose completed CSV or Excel file</span>
            <span className="text-slate-400">Required columns: name, category · employeeCode is optional for unassigned inventory</span>
            <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFile} className="hidden" />
          </label>

          {error && <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>{error}</span></div>}

          {rows.length > 0 && <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200"><span className="font-semibold text-slate-800">Preview · {rows.length} row(s)</span><span className={invalidRows.length ? "text-rose-600" : "text-emerald-600"}>{invalidRows.length ? `${invalidRows.length} need attention` : <><CheckCircle2 className="inline w-3.5 h-3.5 mr-1" />Ready to import</>}</span></div>
            <div className="max-h-64 overflow-auto"><table className="w-full text-left"><thead className="bg-white sticky top-0 border-b border-slate-100"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Asset</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Condition</th><th className="px-3 py-2">Employee Code</th><th className="px-3 py-2">Validation</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => { const employeeCode = row.employeeCode?.trim(); const invalid = invalidRows.includes(row); return <tr key={`${index}-${row.name}`} className={invalid ? "bg-rose-50/70" : ""}><td className="px-3 py-2 text-slate-400">{index + 2}</td><td className="px-3 py-2 font-medium text-slate-800">{row.name || "Missing name"}</td><td className="px-3 py-2 text-slate-600">{row.category || "Missing"}</td><td className="px-3 py-2 text-slate-600">{row.condition || "Missing"}</td><td className="px-3 py-2 font-mono text-slate-700">{employeeCode || "Unassigned"}</td><td className={`px-3 py-2 ${invalid ? "text-rose-600" : "text-emerald-600"}`}>{invalid ? "Check row values" : "Valid"}</td></tr>; })}</tbody></table></div>
          </div>}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200"><button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">Cancel</button><button onClick={submit} disabled={isSubmitting || !rows.length || Boolean(invalidRows.length)} className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm disabled:opacity-50">{isSubmitting ? "Importing..." : `Import ${rows.length || ""} asset${rows.length === 1 ? "" : "s"}`}</button></div>
        </div>
      </div>
    </Modal>
  );
}
