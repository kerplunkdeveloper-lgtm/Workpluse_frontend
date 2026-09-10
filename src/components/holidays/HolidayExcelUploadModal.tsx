'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Loader2,
  Download,
  Calendar,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileText,
} from 'lucide-react';
import api from '@/lib/api';

interface HolidayExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number, message: string) => void;
  currentYear: number;
}

interface ParsedRow {
  rowNum: number;
  rawDate: string;
  formattedDate: string;
  name: string;
  type: 'GOVERNMENT' | 'COMPANY' | 'OPTIONAL';
  description: string;
  branch: string;
  isValid: boolean;
  errors: string[];
}

export default function HolidayExcelUploadModal({
  isOpen,
  onClose,
  onSuccess,
  currentYear,
}: HolidayExcelUploadModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'errors'>('all');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rawText, setRawText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper: Normalize date to YYYY-MM-DD
  const normalizeDate = (raw: any): { formatted: string; isValid: boolean } => {
    if (!raw) return { formatted: '', isValid: false };

    // If it's already Date object
    if (raw instanceof Date && !isNaN(raw.getTime())) {
      return { formatted: raw.toISOString().split('T')[0], isValid: true };
    }

    const str = String(raw).trim();

    // Standard ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const d = new Date(str);
      return { formatted: str, isValid: !isNaN(d.getTime()) };
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      const iso = `${year}-${month}-${day}`;
      const d = new Date(iso);
      return { formatted: iso, isValid: !isNaN(d.getTime()) };
    }

    // MM/DD/YYYY
    const mdyMatch = str.match(/^(\d{1,2})[/\.](\d{1,2})[/\.](\d{4})$/);
    if (mdyMatch) {
      const month = mdyMatch[1].padStart(2, '0');
      const day = mdyMatch[2].padStart(2, '0');
      const year = mdyMatch[3];
      const iso = `${year}-${month}-${day}`;
      const d = new Date(iso);
      return { formatted: iso, isValid: !isNaN(d.getTime()) };
    }

    // Check if numeric serial (Excel date offset)
    const num = Number(str);
    if (!isNaN(num) && num > 20000 && num < 70000) {
      const utcDays = Math.floor(num - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      return { formatted: dateInfo.toISOString().split('T')[0], isValid: true };
    }

    // Try fallback parsing
    const parsedFallback = new Date(str);
    if (!isNaN(parsedFallback.getTime())) {
      return { formatted: parsedFallback.toISOString().split('T')[0], isValid: true };
    }

    return { formatted: str, isValid: false };
  };

  // Process array of raw row objects from sheet or CSV
  const processRawData = (rows: any[]) => {
    const validated: ParsedRow[] = rows.map((row, idx) => {
      // Look for known headers in various cases
      const dateVal =
        row.Date || row.date || row['Holiday Date'] || row['holiday_date'] || row.DATE || row[0];
      const nameVal =
        row['Holiday Name'] ||
        row.name ||
        row.HolidayName ||
        row['holiday_name'] ||
        row.Holiday ||
        row.NAME ||
        row[1];
      const typeVal = row.Type || row.type || row['Holiday Type'] || row.TYPE || row[2];
      const descVal =
        row.Description || row.description || row.Notes || row.desc || row.DESC || row[3];
      const branchVal =
        row.Branch || row.branch || row['Branch Name'] || row.BRANCH || row[4];

      const errors: string[] = [];
      const { formatted, isValid: isDateValid } = normalizeDate(dateVal);

      if (!dateVal || !isDateValid) {
        errors.push('Invalid or missing Date format (requires YYYY-MM-DD)');
      }

      const name = nameVal ? String(nameVal).trim() : '';
      if (!name) {
        errors.push('Holiday Name is required');
      }

      let type: 'GOVERNMENT' | 'COMPANY' | 'OPTIONAL' = 'GOVERNMENT';
      if (typeVal) {
        const cleanType = String(typeVal).toUpperCase().trim();
        if (cleanType.includes('GOV')) {
          type = 'GOVERNMENT';
        } else if (cleanType.includes('COMP')) {
          type = 'COMPANY';
        } else if (cleanType.includes('OPT') || cleanType.includes('FLOAT') || cleanType.includes('RESTRICT')) {
          type = 'OPTIONAL';
        } else {
          type = 'GOVERNMENT';
        }
      }

      const description = descVal ? String(descVal).trim() : '';
      const branch = branchVal ? String(branchVal).trim() : 'All Branches';

      return {
        rowNum: idx + 1,
        rawDate: String(dateVal || ''),
        formattedDate: formatted,
        name,
        type,
        description,
        branch,
        isValid: errors.length === 0,
        errors,
      };
    });

    setParsedRows(validated);
    setStep('preview');
  };

  // Handle file reading
  const handleFileChange = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonRows.length === 0) {
          alert('No data rows found in the uploaded file');
          setLoading(false);
          return;
        }

        processRawData(jsonRows);
      } catch (err: any) {
        alert(`Failed to parse file: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Download Sample Excel Template
  const downloadSampleTemplate = () => {
    const templateData = [
      {
        Date: `${currentYear}-01-26`,
        'Holiday Name': 'Republic Day',
        Type: 'GOVERNMENT',
        Description: 'National Public Holiday celebrating the Indian constitution',
      },
      {
        Date: `${currentYear}-08-15`,
        'Holiday Name': 'Independence Day',
        Type: 'GOVERNMENT',
        Description: 'National Public Holiday celebrating Independence',
      },
      {
        Date: `${currentYear}-10-02`,
        'Holiday Name': 'Gandhi Jayanti',
        Type: 'GOVERNMENT',
        Description: 'National Public Holiday honoring Mahatma Gandhi',
      },
      {
        Date: `${currentYear}-12-25`,
        'Holiday Name': 'Christmas',
        Type: 'COMPANY',
        Description: 'Corporate Christmas Observance',
      },
      {
        Date: `${currentYear}-03-04`,
        'Holiday Name': 'Holi',
        Type: 'GOVERNMENT',
        Description: 'Festival of colors celebration',
      },
      {
        Date: `${currentYear}-11-12`,
        'Holiday Name': 'Deepavali Eve (Floating)',
        Type: 'OPTIONAL',
        Description: 'Optional cultural holiday',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Holidays');

    // Auto fit column widths
    worksheet['!cols'] = [
      { wch: 14 }, // Date
      { wch: 28 }, // Holiday Name
      { wch: 16 }, // Type
      { wch: 50 }, // Description
    ];

    XLSX.writeFile(workbook, `WorkPulse_Holiday_Template_${currentYear}.xlsx`);
  };

  // Parse text / pasted CSV
  const handleParsePastedText = () => {
    if (!rawText.trim()) return;
    setLoading(true);
    try {
      // Split lines
      const lines = rawText.trim().split('\n');
      const rows = lines.map((line) => {
        // Support tab or comma separation
        const delimiter = line.includes('\t') ? '\t' : ',';
        const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
        return {
          Date: parts[0],
          'Holiday Name': parts[1],
          Type: parts[2] || 'GOVERNMENT',
          Description: parts[3] || '',
        };
      });

      // Filter out header line if present
      const first = rows[0];
      const isHeader =
        first &&
        (String(first.Date).toLowerCase().includes('date') ||
          String(first['Holiday Name']).toLowerCase().includes('name'));

      const cleanRows = isHeader ? rows.slice(1) : rows;
      processRawData(cleanRows);
    } catch (err: any) {
      alert(`Failed to parse text: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Ingest Valid Holidays into Database via Bulk API
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('There are no valid rows to import.');
      return;
    }

    setLoading(true);
    try {
      const payload = validRows.map((r) => ({
        name: r.name,
        date: r.formattedDate,
        type: r.type,
        description: r.description || null,
        branchName: r.branch === 'All Branches' ? null : r.branch,
        isOptional: r.type === 'OPTIONAL',
      }));

      const res = await api.post('/holidays/bulk', { holidays: payload });
      const created = res.data?.data?.created ?? validRows.length;
      const skipped = res.data?.data?.skipped ?? 0;

      setImportResult({ created, skipped });
      setStep('success');

      // Call parent success callback
      onSuccess(
        created,
        `Successfully imported ${created} holiday${created === 1 ? '' : 's'} (${skipped} skipped as duplicates).`
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Bulk import failed';
      alert(`Import Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtered rows for preview table
  const filteredRows = parsedRows.filter((r) => {
    if (filterMode === 'valid') return r.isValid;
    if (filterMode === 'errors') return !r.isValid;
    return true;
  });

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-7 shadow-2xl space-y-5 animate-in fade-in-50 duration-200 max-h-[92vh] flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                STEP 7.1 — Holiday Excel/CSV Upload
              </h3>
              <p className="text-[11px] text-slate-400">
                Upload complete yearly calendar with validation, live preview, and duplicate checking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Progression Tabs */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-50 p-1.5 rounded-2xl">
          <div
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              step === 'upload'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>1. Upload File</span>
          </div>

          <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />

          <div
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              step === 'preview'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>2. Validate & Preview ({parsedRows.length})</span>
          </div>

          <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />

          <div
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              step === 'success'
                ? 'bg-white text-emerald-600 shadow-2xs'
                : 'text-slate-400'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>3. Import Complete</span>
          </div>
        </div>

        {/* BODY: STEP 1 - UPLOAD FILE */}
        {step === 'upload' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            {/* Template Download Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Need the formatted Excel template?
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Includes columns for <span className="font-semibold text-indigo-700">Date</span>,{' '}
                    <span className="font-semibold text-indigo-700">Holiday Name</span>,{' '}
                    <span className="font-semibold text-indigo-700">Type</span>, and{' '}
                    <span className="font-semibold text-indigo-700">Description</span>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="flex items-center gap-1.5 rounded-xl bg-white border border-indigo-200 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 shadow-2xs shrink-0 transition-all active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Sample .xlsx</span>
              </button>
            </div>

            {/* Drag & Drop Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                  : 'border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 mb-3 shadow-2xs">
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                ) : (
                  <FileSpreadsheet className="h-6 w-6" />
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-800">
                Click to browse or drag & drop Excel / CSV file
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                Supports <span className="font-semibold text-slate-600">.xlsx, .xls, .csv</span> files
                up to 10MB
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs">
                <Upload className="h-3.5 w-3.5 text-indigo-600" />
                <span>Select File from Computer</span>
              </div>
            </div>

            {/* Fallback: Direct Copy-Paste */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPasteBox(!showPasteBox)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{showPasteBox ? 'Hide Paste Area' : 'Or paste text / CSV data directly'}</span>
              </button>

              {showPasteBox && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Paste comma or tab-separated rows:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setRawText(
                          `Date\tHoliday Name\tType\tDescription\n${currentYear}-01-26\tRepublic Day\tGOVERNMENT\tNational Holiday\n${currentYear}-08-15\tIndependence Day\tGOVERNMENT\tNational Holiday\n${currentYear}-10-02\tGandhi Jayanti\tGOVERNMENT\tNational Holiday\n${currentYear}-12-25\tChristmas\tCOMPANY\tCompany Holiday`
                        )
                      }
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Paste Example Rows
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="2026-01-26, Republic Day, GOVERNMENT, National Holiday"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleParsePastedText}
                    disabled={!rawText.trim() || loading}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    Parse Pasted Text
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BODY: STEP 2 - PREVIEW & VALIDATE */}
        {step === 'preview' && (
          <div className="space-y-3 overflow-hidden flex flex-col flex-1">
            {/* Metric Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  File: <span className="text-indigo-600">{fileName || 'Pasted Data'}</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-500">Total: {parsedRows.length} rows</span>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                    filterMode === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  All ({parsedRows.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterMode('valid')}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                    filterMode === 'valid'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Valid ({validCount})</span>
                </button>

                {invalidCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterMode('errors')}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                      filterMode === 'errors'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span>Errors ({invalidCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Preview Table */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 max-h-[320px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Holiday Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Scope</th>
                    <th className="py-2.5 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredRows.map((row) => (
                    <tr
                      key={row.rowNum}
                      className={`hover:bg-slate-50 transition-colors ${
                        !row.isValid ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                        {row.rowNum}
                      </td>

                      <td className="py-2.5 px-3">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Valid</span>
                          </span>
                        ) : (
                          <div className="inline-flex flex-col">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                              <XCircle className="h-3 w-3 text-rose-600" />
                              <span>Error</span>
                            </span>
                            <span className="text-[9px] text-rose-600 mt-0.5">
                              {row.errors.join(', ')}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono font-semibold">
                        {row.isValid ? (
                          <span className="text-slate-900">{row.formattedDate}</span>
                        ) : (
                          <span className="text-rose-600 line-through">{row.rawDate}</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-bold text-slate-900">{row.name || '—'}</td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            row.type === 'GOVERNMENT'
                              ? 'bg-emerald-50 text-emerald-700'
                              : row.type === 'COMPANY'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-[11px] text-slate-500">{row.branch}</td>

                      <td className="py-2.5 px-3 text-[11px] text-slate-500 max-w-[180px] truncate">
                        {row.description || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Validation Callout */}
            {invalidCount > 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  {invalidCount} invalid row(s) detected. Only the{' '}
                  <strong className="font-bold">{validCount} valid rows</strong> will be imported.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>All {validCount} rows successfully validated and ready to import!</span>
              </div>
            )}
          </div>
        )}

        {/* BODY: STEP 3 - SUCCESS */}
        {step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Import Complete!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your holiday calendar has been updated. Attendance and leave calculations will
                automatically observe these days.
              </p>
            </div>

            <div className="inline-flex items-center gap-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs">
              <div>
                <span className="block text-xl font-black text-emerald-600">
                  {importResult?.created || 0}
                </span>
                <span className="text-[11px] text-slate-500">Holidays Created</span>
              </div>
              <div className="h-8 w-[1px] bg-slate-200" />
              <div>
                <span className="block text-xl font-black text-slate-700">
                  {importResult?.skipped || 0}
                </span>
                <span className="text-[11px] text-slate-500">Duplicates Skipped</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          {step === 'preview' ? (
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Choose Another File</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              {step === 'success' ? 'Close' : 'Cancel'}
            </button>

            {step === 'preview' && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={loading || validCount === 0}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#4f46e5] text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-blue-500/25 hover:shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>Import {validCount} Holidays</span>
              </button>
            )}

            {step === 'success' && (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
              >
                <span>View in Calendar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
