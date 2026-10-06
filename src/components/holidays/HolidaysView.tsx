"use client";

import React, { useEffect, useState } from "react";
import { holidaysApi, branchesApi } from "@/lib/api";
import { formatDate, unwrapList } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Calendar, Plus, Trash2, Loader2, Building2, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import DatePicker from "@/components/ui/DatePicker";
import { confirmDialog } from "@/components/ui/confirmDialog";

export default function HolidaysView() {
  const { role } = useAuth();
  const canManage = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "MANAGER";
  const canDelete = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
  const canBulkImport = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";

  const [holidays, setHolidays] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("GOVERNMENT");
  const [branchId, setBranchId] = useState("");
  const [description, setDescription] = useState("");
  const [isOptional, setIsOptional] = useState(false);
  const [importing, setImporting] = useState(false);

  const parseCsv = (text: string) => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(cell.trim());
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    if (rows.length < 2) return [];
    const headers = rows[0].map((header) => header.toLowerCase().replace(/[_\s-]+/g, "").trim());
    return rows.slice(1).map((values) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => { record[header] = values[index] || ""; });
      return {
        name: record.name || record.holiday || record["holidayname"],
        date: record.date || record["holidaydate"],
        type: record.type || record["holidaytype"] || "COMPANY",
        branch: record.branch || record.branchname || record.branchid || "",
        description: record.description || record.note || "",
      };
    }).filter((item) => item.name || item.date);
  };

  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please choose a .csv file.");
      return;
    }
    setImporting(true);
    try {
      const records = parseCsv(await file.text());
      if (!records.length) {
        toast.error("The CSV has no holiday rows. Add name and date columns.");
        return;
      }
      if (records.length > 1000) {
        toast.error("Import is limited to 1,000 holiday rows at a time.");
        return;
      }
      const res = await holidaysApi.bulk(records);
      if (res?.success) {
        const result = res.data || {};
        toast.success(`Imported ${result.created || 0} holiday(s); skipped ${result.skipped || 0}.`);
        load();
        return;
      }
      toast.error(res?.message || "Could not import holidays");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Could not import holidays");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "name,date,type,branch,description\nRepublic Day,2027-01-26,GOVERNMENT,,National holiday\nAnnual Day,2027-08-15,COMPANY,Head Office,Company holiday\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "workpulse-holidays-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [hRes, bRes] = await Promise.allSettled([
        holidaysApi.list({ year }),
        branchesApi.list(),
      ]);
      if (hRes.status === "fulfilled") setHolidays(unwrapList(hRes.value));
      if (bRes.status === "fulfilled") setBranches(unwrapList(bRes.value));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [year]);

  const resetForm = () => {
    setName("");
    setDate("");
    setType("GOVERNMENT");
    setBranchId("");
    setDescription("");
    setIsOptional(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) {
      toast.error("Name and date are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await holidaysApi.create({
        name,
        date,
        type,
        branchId: branchId || null,
        description,
        isOptional: isOptional || type === "OPTIONAL",
      });
      if (res?.success) {
        toast.success("Holiday added");
        setModalOpen(false);
        resetForm();
        load();
      } else {
        toast.error(res?.message || "Could not add holiday");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Could not add holiday");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: "Remove this holiday?", message: "It will no longer count in attendance or payroll calculations.", confirmLabel: "Remove" }))) return;
    try {
      const res = await holidaysApi.remove(id);
      if (res?.success !== false) {
        toast.success("Holiday removed");
        load();
      } else {
        toast.error(res?.message || "Delete failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          icon={Calendar}
          title="Holidays"
          description="Company and government holidays used by leave counting and attendance."
        />
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
          >
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {canManage && (
            <div className="flex items-center gap-2">
              {canBulkImport && (
                <>
                  <input id="holiday-csv-upload" type="file" accept=".csv,text/csv" onChange={handleCsvImport} className="hidden" />
                  <button
                    type="button"
                    onClick={() => document.getElementById("holiday-csv-upload")?.click()}
                    disabled={importing}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Import CSV
                  </button>
                  <button type="button" onClick={downloadTemplate} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100" title="Download CSV template">
                    <Download className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add holiday
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-[13px] text-slate-700">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200 font-semibold">
            <tr>
              <th className="py-3.5 px-4">Date</th>
              <th className="py-3.5 px-4">Name</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Scope</th>
              <th className="py-3.5 px-4">Optional</th>
              {canDelete && <th className="py-3.5 px-4 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">Loading holidays…</td>
              </tr>
            ) : holidays.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No holidays for {year}. Add government and company days so leave and payroll stay accurate.
                </td>
              </tr>
            ) : (
              holidays.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{formatDate(h.date)}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{h.name}</div>
                    {h.description && <div className="text-xs text-slate-500">{h.description}</div>}
                  </td>
                  <td className="py-3.5 px-4">{h.type}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {h.branch?.name || "All branches"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">{h.isOptional ? "Yes" : "No"}</td>
                  {canDelete && (
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">Add holiday</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Holiday name"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <DatePicker
              value={date}
              onChange={(val) => setDate(val)}
              placeholder="Holiday date"
              required
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              <option value="GOVERNMENT">Government</option>
              <option value="COMPANY">Company</option>
              <option value="OPTIONAL">Optional</option>
            </select>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              rows={2}
            />
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <input type="checkbox" checked={isOptional} onChange={(e) => setIsOptional(e.target.checked)} />
              Optional holiday
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-2 text-xs rounded-xl border border-slate-200">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-2 text-xs rounded-xl bg-indigo-600 text-white font-semibold flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
