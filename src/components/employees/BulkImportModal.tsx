"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
  Info,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { employeesApi } from "@/lib/api";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branches?: any[];
  departments?: any[];
  shifts?: any[];
}

interface ParsedEmployeeRow {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  branch?: string;
  shift?: string;
  role?: string;
  _rowNum: number;
  _isValid: boolean;
  _error?: string;
}

interface ImportSummary {
  importedCount: number;
  failedCount: number;
  imported: Array<{ name?: string; email: string; employeeCode?: string }>;
  failed: Array<{ row?: number; email: string; reason: string }>;
}

export default function BulkImportModal({
  isOpen,
  onClose,
  onSuccess,
  branches = [],
  departments = [],
  shifts = [],
}: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedEmployeeRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Generate and download a sample Excel template
  const handleDownloadTemplate = () => {
    try {
      const sampleBranch = branches[0]?.name || "Headquarters";
      const sampleDept = departments[0]?.name || "Engineering";
      const sampleShift = shifts[0]?.name || "General Shift";

      const templateData = [
        {
          "First Name": "Jane",
          "Last Name": "Doe",
          "Email": "jane.doe@example.com",
          "Phone": "+1-555-0199",
          "Employee Code": "EMP-1001",
          "Designation": "Senior Software Engineer",
          "Department": sampleDept,
          "Branch": sampleBranch,
          "Shift": sampleShift,
          "Role": "EMPLOYEE",
        },
        {
          "First Name": "Alexander",
          "Last Name": "Smith",
          "Email": "alex.smith@example.com",
          "Phone": "+1-555-0182",
          "Employee Code": "EMP-1002",
          "Designation": "Operations Lead",
          "Department": departments[1]?.name || sampleDept,
          "Branch": sampleBranch,
          "Shift": sampleShift,
          "Role": "MANAGER",
        },
        {
          "First Name": "Priya",
          "Last Name": "Sharma",
          "Email": "priya.sharma@example.com",
          "Phone": "+91-9876543210",
          "Employee Code": "",
          "Designation": "Product Designer",
          "Department": departments[2]?.name || sampleDept,
          "Branch": sampleBranch,
          "Shift": sampleShift,
          "Role": "EMPLOYEE",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);

      // Set column widths for readability
      worksheet["!cols"] = [
        { wch: 16 }, // First Name
        { wch: 16 }, // Last Name
        { wch: 28 }, // Email
        { wch: 18 }, // Phone
        { wch: 16 }, // Employee Code
        { wch: 26 }, // Designation
        { wch: 20 }, // Department
        { wch: 20 }, // Branch
        { wch: 18 }, // Shift
        { wch: 14 }, // Role
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
      XLSX.writeFile(workbook, "WorkPulse_Employee_Import_Template.xlsx");

      toast.success("Excel template downloaded! Fill in your data and upload.");
    } catch (err: any) {
      console.error("Template download error:", err);
      toast.error("Failed to generate template: " + (err?.message || "Unknown error"));
    }
  };

  // Parse incoming file (.xlsx, .xls, .csv)
  const processFile = async (selectedFile: File) => {
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(extension)) {
      toast.error("Please select a valid Excel (.xlsx, .xls) or CSV file.");
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setImportSummary(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("No sheet found in uploaded file.");
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (rawRows.length === 0) {
        toast.warning("The selected sheet contains no employee rows.");
        setParsedRows([]);
        setIsParsing(false);
        return;
      }

      const rows: ParsedEmployeeRow[] = rawRows.map((raw, idx) => {
        const rowNum = idx + 2; // Accounting for 1-based index + header row

        const firstName = String(raw["First Name"] || raw.firstName || raw.name || raw["Name"] || "").trim();
        const lastName = String(raw["Last Name"] || raw.lastName || "").trim();
        const email = String(raw["Email"] || raw.email || raw["Work Email"] || raw.workEmail || "").trim().toLowerCase();
        const phone = String(raw["Phone"] || raw.phone || raw["Mobile"] || raw.mobile || "").trim();
        const employeeCode = String(raw["Employee Code"] || raw.employeeCode || raw["Code"] || raw.code || "").trim();
        const designation = String(raw["Designation"] || raw.designation || raw["Title"] || raw.title || "").trim();
        const department = String(raw["Department"] || raw.department || "").trim();
        const branch = String(raw["Branch"] || raw.branch || "").trim();
        const shift = String(raw["Shift"] || raw.shift || "").trim();
        const role = String(raw["Role"] || raw.role || "EMPLOYEE").trim().toUpperCase();

        let isValid = true;
        let error = "";

        if (!firstName) {
          isValid = false;
          error = "Missing First Name";
        } else if (!email || !email.includes("@")) {
          isValid = false;
          error = "Invalid or Missing Email";
        }

        return {
          firstName,
          lastName: lastName || undefined,
          email,
          phone: phone || undefined,
          employeeCode: employeeCode || undefined,
          designation: designation || undefined,
          department: department || undefined,
          branch: branch || undefined,
          shift: shift || undefined,
          role: role === "MANAGER" ? "MANAGER" : "EMPLOYEE",
          _rowNum: rowNum,
          _isValid: isValid,
          _error: error,
        };
      });

      setParsedRows(rows);
      const validCount = rows.filter((r) => r._isValid).length;
      toast.info(`Parsed ${rows.length} rows (${validCount} ready to import)`);
    } catch (err: any) {
      console.error("Error reading file:", err);
      toast.error("Failed to parse file: " + (err.message || "Invalid file structure"));
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setImportSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmitImport = async () => {
    const validRows = parsedRows.filter((r) => r._isValid);
    if (validRows.length === 0) {
      toast.error("No valid employee rows to import.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = validRows.map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone,
        employeeCode: r.employeeCode,
        designation: r.designation,
        department: r.department,
        branch: r.branch,
        shift: r.shift,
        role: r.role,
      }));

      // The API accepts up to 200 rows per request. Send larger sheets in
      // chunks and merge the results, so one request never outlives the proxy.
      const CHUNK_SIZE = 200;
      const merged = {
        imported: [] as any[],
        failed: [] as any[],
        departments: new Set<string>(),
        branches: new Set<string>(),
        warnings: [] as string[],
      };
      for (let offset = 0; offset < payload.length; offset += CHUNK_SIZE) {
        const chunk = payload.slice(offset, offset + CHUNK_SIZE);
        try {
          const part = await employeesApi.bulkImport(chunk);
          const d = part?.data || part || {};
          const shift = (r: any) => ({ ...r, row: (r.row || 0) + offset });
          merged.imported.push(...(d.imported || []).map(shift));
          merged.failed.push(...(d.failed || []).map(shift));
          (d.createdDepartments || []).forEach((n: string) => merged.departments.add(n));
          (d.createdBranches || []).forEach((n: string) => merged.branches.add(n));
          merged.warnings.push(...(d.warnings || []));
        } catch (chunkErr: any) {
          const reason = chunkErr?.response?.data?.message || chunkErr?.message || "Request failed";
          chunk.forEach((r, i) =>
            merged.failed.push({ row: offset + i + 1, email: r.email || "N/A", status: "FAILED", reason }),
          );
        }
      }
      const res = {
        success: true,
        message:
          `Imported ${merged.imported.length} of ${payload.length} employees.` +
          (merged.departments.size ? ` Created ${merged.departments.size} new department(s): ${[...merged.departments].join(", ")}.` : "") +
          (merged.branches.size ? ` Created ${merged.branches.size} new branch(es): ${[...merged.branches].join(", ")}.` : ""),
        data: {
          imported: merged.imported,
          failed: merged.failed,
          importedCount: merged.imported.length,
          failedCount: merged.failed.length,
        },
      };
      merged.warnings.forEach((w) => toast.warning(w));

      if (res?.success) {
        const data = res.data || {};
        const imported = data.imported || [];
        const failed = data.failed || [];

        setImportSummary({
          importedCount: data.importedCount ?? imported.length,
          failedCount: data.failedCount ?? failed.length,
          imported,
          failed,
        });

        if (imported.length > 0) {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
          toast.success(res.message || `Successfully imported ${imported.length} employees!`);
        } else {
          toast.warning("Import finished, but 0 employees were imported. Check failed details.");
        }
      } else {
        toast.error(res?.message || "Bulk import failed");
      }
    } catch (err: any) {
      console.error("Bulk import failed:", err);
      const msg = err.response?.data?.message || err.message || "An error occurred during import";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r._isValid).length;
  const invalidCount = parsedRows.filter((r) => !r._isValid).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                Import Employees via Excel / CSV
              </h3>
              <p className="text-xs text-slate-500">
                Bulk upload workforce roster with auto-mapping for branches, departments, and shifts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Download Sample Template Banner */}
          {!importSummary && (
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-emerald-950">
                    Need the formatted Excel spreadsheet template?
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Download our ready-to-use template with columns prefilled with sample workforce rows.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download Excel Template
              </button>
            </div>
          )}

          {/* Results Screen */}
          {importSummary ? (
            <div className="space-y-4 py-2">
              <div className="text-center py-4">
                <div
                  className={`w-14 h-14 mx-auto rounded-3xl flex items-center justify-center mb-3 shadow-md ${
                    importSummary.importedCount > 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {importSummary.importedCount > 0 ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : (
                    <AlertCircle className="w-7 h-7" />
                  )}
                </div>
                <h4 className="text-lg font-bold text-slate-900">
                  {importSummary.importedCount > 0 ? "Import Complete!" : "Import Completed with Issues"}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Processed {importSummary.importedCount + importSummary.failedCount} records from spreadsheet
                </p>
              </div>

              {/* Status metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                  <div className="text-2xl font-bold text-emerald-700">
                    {importSummary.importedCount}
                  </div>
                  <div className="text-xs font-medium text-emerald-800 mt-0.5">
                    Successfully Created & Provisioned
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                  <div className="text-2xl font-bold text-rose-700">
                    {importSummary.failedCount}
                  </div>
                  <div className="text-xs font-medium text-rose-800 mt-0.5">
                    Skipped or Encountered Errors
                  </div>
                </div>
              </div>

              {/* Failures List if any */}
              {importSummary.failed.length > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-2">
                  <h5 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Skipped Rows ({importSummary.failed.length})
                  </h5>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {importSummary.failed.map((f, i) => (
                      <div
                        key={i}
                        className="text-xs bg-white/80 border border-rose-100 rounded-xl p-2 flex items-center justify-between gap-2"
                      >
                        <span className="font-mono text-slate-700 truncate">
                          {f.row ? `Row ${f.row}: ` : ""}{f.email}
                        </span>
                        <span className="text-rose-600 text-xs font-medium shrink-0">
                          {f.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Imported list highlights */}
              {importSummary.imported.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Imported Workforce ({importSummary.imported.length})
                  </h5>
                  <div className="max-h-36 overflow-y-auto flex flex-wrap gap-1.5">
                    {importSummary.imported.map((emp, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-medium"
                      >
                        {emp.name || emp.email}
                        {emp.employeeCode && (
                          <span className="text-slate-400 font-mono text-xs">
                            ({emp.employeeCode})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* File Dropzone */}
              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                    isDragOver
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-slate-300 hover:border-emerald-500 hover:bg-slate-50/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Click to select file or drag & drop here
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports Microsoft Excel (<span className="font-mono">.xlsx</span>, <span className="font-mono">.xls</span>) and Comma-Separated Values (<span className="font-mono">.csv</span>)
                  </p>
                  <span className="inline-block mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Max 500 employees per import
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected File Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} total rows parsed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Change File
                      </button>
                    </div>
                  </div>

                  {/* Parsing loading state */}
                  {isParsing && (
                    <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      Parsing spreadsheet rows...
                    </div>
                  )}

                  {/* Summary pills */}
                  {!isParsing && parsedRows.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                        Total: {parsedRows.length}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Ready to import: {validCount}
                      </span>
                      {invalidCount > 0 && (
                        <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-800 font-semibold border border-rose-200 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          Missing required data: {invalidCount}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Rows Table Preview */}
                  {!isParsing && parsedRows.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="max-h-60 overflow-x-auto overflow-y-auto">
                        <table className="w-full text-left text-[13px]">
                          <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-xs">
                            <tr>
                              <th className="px-3 py-2">Row</th>
                              <th className="px-3 py-2">Name</th>
                              <th className="px-3 py-2">Email</th>
                              <th className="px-3 py-2">Emp Code</th>
                              <th className="px-3 py-2">Designation</th>
                              <th className="px-3 py-2">Dept</th>
                              <th className="px-3 py-2">Branch</th>
                              <th className="px-3 py-2">Shift</th>
                              <th className="px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-normal text-slate-800 bg-white">
                            {parsedRows.slice(0, 15).map((row, idx) => (
                              <tr
                                key={idx}
                                className={row._isValid ? "hover:bg-slate-50/80" : "bg-rose-50/30"}
                              >
                                <td className="px-3 py-2 text-slate-400 font-mono">{row._rowNum}</td>
                                <td className="px-3 py-2 font-medium">
                                  {row.firstName ? `${row.firstName} ${row.lastName || ""}` : (
                                    <span className="text-rose-500 font-semibold italic">Missing</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs text-slate-600">
                                  {row.email || (
                                    <span className="text-rose-500 font-semibold italic">Missing</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-500 font-mono text-xs">
                                  {row.employeeCode || <span className="text-slate-400 italic">Auto</span>}
                                </td>
                                <td className="px-3 py-2 text-slate-600">{row.designation || "-"}</td>
                                <td className="px-3 py-2 text-slate-600">{row.department || "-"}</td>
                                <td className="px-3 py-2 text-slate-600">{row.branch || "-"}</td>
                                <td className="px-3 py-2 text-slate-600">{row.shift || "-"}</td>
                                <td className="px-3 py-2">
                                  {row._isValid ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Valid
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-semibold border border-rose-200"
                                      title={row._error}
                                    >
                                      <AlertCircle className="w-3 h-3 text-rose-600" />
                                      {row._error}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {parsedRows.length > 15 && (
                        <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
                          Showing first 15 of {parsedRows.length} rows. All valid rows will be imported.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Department and Branch names that match existing records are linked automatically. Names that do not exist yet are created during the import. Blank cells use the workspace default. Shift names must match an existing shift, otherwise the default shift is used.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition disabled:opacity-50"
          >
            {importSummary ? "Close" : "Cancel"}
          </button>

          {importSummary ? (
            <button
              type="button"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              Done & Refresh Directory
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitImport}
              disabled={isSubmitting || validCount === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing Employees ({validCount})...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  Import {validCount > 0 ? `${validCount} Employees` : "Employees"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
