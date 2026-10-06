"use client";

import React, { useState, useEffect, useRef } from "react";
import { payslipTemplatesApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Palette,
  Upload,
  Sparkles,
  Check,
  Save,
  RotateCcw,
  Printer,
  Building2,
  FileCode,
  ShieldCheck,
  Eye,
  CheckCircle2,
  FileText,
  Sliders,
  Image as ImageIcon,
  Stamp,
  Code2,
  Trash2,
  Layers,
  ChevronRight,
  Loader2,
  QrCode,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface PresetItem {
  key: string;
  name: string;
  badge: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  headerLayout: string;
  showBankDetails: boolean;
  showPanUan: boolean;
  showLeaveBalances: boolean;
  showAttendanceSummary: boolean;
  showOvertimeDetails: boolean;
  showNetSalaryInWords: boolean;
  showBarcodeOrQr: boolean;
  declarationText: string;
}

const PRESET_COLORS = [
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Sky Blue", hex: "#0284c7" },
  { name: "Emerald", hex: "#059669" },
  { name: "Navy Slate", hex: "#0f172a" },
  { name: "Crimson", hex: "#dc2626" },
  { name: "Violet", hex: "#7c3aed" },
];

export default function PayslipTemplateCustomizer() {
  const [activeTab, setActiveTab] = useState<"VISUAL" | "CODE">("VISUAL");
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingSig, setIsUploadingSig] = useState(false);

  // Template Form State
  const [templateName, setTemplateName] = useState("Corporate Slate");
  const [templateKey, setTemplateKey] = useState("MODERN_CORPORATE");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [taxIdentifierLabel, setTaxIdentifierLabel] = useState("CIN / GSTIN");
  const [taxIdentifierValue, setTaxIdentifierValue] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [accentColor, setAccentColor] = useState("#0f172a");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [headerLayout, setHeaderLayout] = useState<"SPLIT" | "CENTERED" | "BANNER">("SPLIT");

  // Section Toggles
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [showPanUan, setShowPanUan] = useState(true);
  const [showLeaveBalances, setShowLeaveBalances] = useState(true);
  const [showAttendanceSummary, setShowAttendanceSummary] = useState(true);
  const [showOvertimeDetails, setShowOvertimeDetails] = useState(true);
  const [showNetSalaryInWords, setShowNetSalaryInWords] = useState(true);
  const [showBarcodeOrQr, setShowBarcodeOrQr] = useState(true);

  // Signatory & Notes
  const [signatoryName, setSignatoryName] = useState("Authorized Signatory");
  const [signatoryTitle, setSignatoryTitle] = useState("Head of Human Resources & Finance");
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(null);
  const [declarationText, setDeclarationText] = useState(
    "This is a computer-generated payslip and does not require a physical seal or signature."
  );
  const [footerNotes, setFooterNotes] = useState("");

  // Custom HTML
  const [customHtml, setCustomHtml] = useState("");

  const previewPrintRef = useRef<HTMLDivElement>(null);

  // Neutral placeholders preview layout without inventing employee records.
  const previewPeriod = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const sampleData = {
    payslipNo: "—",
    period: previewPeriod,
    employee: {
      name: "Employee name",
      code: "Employee code",
      designation: "Designation",
      department: "Department",
      branch: "Branch",
      dateOfJoining: "—",
      panNumber: "—",
      uanNumber: "—",
      bankName: "—",
      accountNumber: "—",
      ifscCode: "—",
    },
    attendance: {
      workingDays: 0,
      presentDays: 0,
      paidLeaveDays: 0,
      unpaidLeaveDays: 0,
      overtimeHours: 0,
      casualLeaveBalance: 0,
      sickLeaveBalance: 0,
    },
    earnings: [
      { label: "Basic Salary", amount: 0 },
      { label: "House Rent Allowance (HRA)", amount: 0 },
    ],
    deductions: [
      { label: "Provident Fund (PF)", amount: 0 },
      { label: "TDS / Income Tax", amount: 0 },
    ],
    grossSalary: 0,
    totalDeductions: 0,
    netSalary: 0,
    netSalaryWords: "—",
  };

  useEffect(() => {
    async function loadTemplateData() {
      setLoading(true);
      try {
        const [presetsRes, tmplRes] = await Promise.allSettled([
          payslipTemplatesApi.getPresets(),
          payslipTemplatesApi.getTemplate(),
        ]);

        if (presetsRes.status === "fulfilled" && presetsRes.value?.success) {
          setPresets(presetsRes.value.data || []);
        }

        if (tmplRes.status === "fulfilled" && tmplRes.value?.success) {
          const t = tmplRes.value.data;
          if (t) {
            setTemplateName(t.name || "Corporate Slate");
            setTemplateKey(t.templateKey || "MODERN_CORPORATE");
            setLogoUrl(t.logoUrl || null);
            setCompanyName(t.companyName || "");
            setAddressLine1(t.addressLine1 || "");
            setAddressLine2(t.addressLine2 || "");
            setTaxIdentifierLabel(t.taxIdentifierLabel || "CIN / GSTIN");
            setTaxIdentifierValue(t.taxIdentifierValue || "");
            setContactEmail(t.contactEmail || "");
            setContactPhone(t.contactPhone || "");
            setPrimaryColor(t.primaryColor || "#4f46e5");
            setAccentColor(t.accentColor || "#0f172a");
            setFontFamily(t.fontFamily || "Inter");
            setHeaderLayout(t.headerLayout || "SPLIT");
            setShowBankDetails(t.showBankDetails ?? true);
            setShowPanUan(t.showPanUan ?? true);
            setShowLeaveBalances(t.showLeaveBalances ?? true);
            setShowAttendanceSummary(t.showAttendanceSummary ?? true);
            setShowOvertimeDetails(t.showOvertimeDetails ?? true);
            setShowNetSalaryInWords(t.showNetSalaryInWords ?? true);
            setShowBarcodeOrQr(t.showBarcodeOrQr ?? true);
            setSignatoryName(t.signatoryName || "Authorized Signatory");
            setSignatoryTitle(t.signatoryTitle || "Head of Human Resources");
            setSignatureImageUrl(t.signatureImageUrl || null);
            setDeclarationText(
              t.declarationText || "This is a computer-generated payslip and does not require a physical seal or signature."
            );
            setFooterNotes(t.footerNotes || "");
            setCustomHtml(t.customHtml || "");
          }
        }
      } catch (err) {
        console.error("Failed to load template:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTemplateData();
  }, []);

  const handleApplyPreset = (preset: PresetItem) => {
    setTemplateKey(preset.key);
    setTemplateName(preset.name);
    setPrimaryColor(preset.primaryColor);
    setAccentColor(preset.accentColor);
    setFontFamily(preset.fontFamily);
    setHeaderLayout(preset.headerLayout as any);
    setShowBankDetails(preset.showBankDetails);
    setShowPanUan(preset.showPanUan);
    setShowLeaveBalances(preset.showLeaveBalances);
    setShowAttendanceSummary(preset.showAttendanceSummary);
    setShowOvertimeDetails(preset.showOvertimeDetails);
    setShowNetSalaryInWords(preset.showNetSalaryInWords);
    setShowBarcodeOrQr(preset.showBarcodeOrQr);
    setDeclarationText(preset.declarationText);
    toast.info(`Applied "${preset.name}" preset styling`);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("assetType", "logo");
      const res = await payslipTemplatesApi.uploadAsset(fd);
      if (res?.success) {
        setLogoUrl(res.data.url);
        toast.success("Company logo uploaded successfully!");
      } else {
        toast.error(res?.message || "Failed to upload logo");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSig(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("assetType", "signature");
      const res = await payslipTemplatesApi.uploadAsset(fd);
      if (res?.success) {
        setSignatureImageUrl(res.data.url);
        toast.success("Authorized signature stamp uploaded successfully!");
      } else {
        toast.error(res?.message || "Failed to upload signature");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to upload signature");
    } finally {
      setIsUploadingSig(false);
    }
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: templateName,
        templateKey: activeTab === "CODE" ? "CUSTOM_HTML" : templateKey,
        logoUrl,
        companyName,
        addressLine1,
        addressLine2,
        taxIdentifierLabel,
        taxIdentifierValue,
        contactEmail,
        contactPhone,
        primaryColor,
        accentColor,
        fontFamily,
        headerLayout,
        showBankDetails,
        showPanUan,
        showLeaveBalances,
        showAttendanceSummary,
        showOvertimeDetails,
        showNetSalaryInWords,
        showBarcodeOrQr,
        signatoryName,
        signatoryTitle,
        signatureImageUrl,
        declarationText,
        footerNotes,
        customHtml: activeTab === "CODE" ? customHtml : undefined,
      };

      const res = await payslipTemplatesApi.saveTemplate(payload);
      if (res?.success) {
        toast.success("Corporate Payslip Template published & saved!");
        confetti({ particleCount: 50, spread: 60 });
      } else {
        toast.error(res?.message || "Failed to save template");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToPreset = async () => {
    try {
      const res = await payslipTemplatesApi.resetPreset("MODERN_CORPORATE");
      if (res?.success) {
        toast.success("Reset to default corporate layout!");
        const t = res.data;
        setPrimaryColor(t.primaryColor);
        setHeaderLayout("SPLIT");
        setCustomHtml("");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset");
    }
  };

  const handlePrintTestPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading Payslip Template Studio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Company Branding Studio</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Corporate Payslip Template Customizer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure company letterhead, branding palettes, section toggles, and official signatory stamp for all employee payslips.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetToPreset}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handlePrintTestPdf}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Test A4</span>
          </button>

          <button
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save & Publish</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Controls (5 cols) | Right Live A4 Preview (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
        {/* ── LEFT CONFIGURATION PANEL (Hidden on print) ────────────────────────── */}
        <div className="lg:col-span-5 space-y-5 print:hidden">
          {/* Mode Switch: Visual vs Custom Code */}
          <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setActiveTab("VISUAL")}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                activeTab === "VISUAL"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Visual Customizer</span>
            </button>
            <button
              onClick={() => setActiveTab("CODE")}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                activeTab === "CODE"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Custom HTML / Upload</span>
            </button>
          </div>

          {activeTab === "VISUAL" ? (
            <div className="space-y-5">
              {/* Presets Grid */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Choose Base Preset</span>
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {presets.map((p) => {
                    const active = templateKey === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => handleApplyPreset(p)}
                        className={`text-left p-3 rounded-2xl border transition relative ${
                          active
                            ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">{p.name}</span>
                          {active && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Company Branding & Letterhead */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Company Letterhead & Logo</span>
                </h3>

                {/* Logo Upload Box */}
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Company Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Company Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition">
                        {isUploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        <span>Upload Logo</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {logoUrl && (
                        <button
                          onClick={() => setLogoUrl(null)}
                          className="text-xs text-rose-600 hover:underline block font-semibold"
                        >
                          Remove logo
                        </button>
                      )}
                      <p className="text-xs text-slate-400">PNG or SVG with transparent background recommended</p>
                    </div>
                  </div>
                </div>

                {/* Company Name & Address */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1">Company Legal Name *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Technologies Private Limited"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="e.g. 100 Cyber Tower, Tech Hub"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1">Address Line 2 / City / Pincode</label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="e.g. White Town, Pondicherry 605001"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1">Tax Label</label>
                      <input
                        type="text"
                        value={taxIdentifierLabel}
                        onChange={(e) => setTaxIdentifierLabel(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1">Registration / CIN / GST</label>
                      <input
                        type="text"
                        value={taxIdentifierValue}
                        onChange={(e) => setTaxIdentifierValue(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Palette & Header Style */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  <span>Color Theme & Layout</span>
                </h3>

                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Primary Accent Color</label>
                  <div className="flex items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setPrimaryColor(c.hex)}
                        className={`w-7 h-7 rounded-full border-2 transition ${
                          primaryColor === c.hex ? "scale-110 border-white shadow-md ring-2 ring-indigo-500" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                    <div className="ml-2 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }} />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="text-xs font-mono w-16 bg-transparent outline-none uppercase font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Header Layout Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["SPLIT", "CENTERED", "BANNER"] as const).map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHeaderLayout(h)}
                        className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition ${
                          headerLayout === h
                            ? "bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-500/20"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {h === "SPLIT" ? "Split Dual" : h === "CENTERED" ? "Centered" : "Top Banner"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section Display Checkboxes */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Visible Sections & Toggles</span>
                </h3>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBankDetails}
                      onChange={(e) => setShowBankDetails(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 font-medium">Bank Account & IFSC details</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPanUan}
                      onChange={(e) => setShowPanUan(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 font-medium">PAN & UAN / PF Numbers</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAttendanceSummary}
                      onChange={(e) => setShowAttendanceSummary(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 font-medium">Attendance & Shift Days summary</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLeaveBalances}
                      onChange={(e) => setShowLeaveBalances(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 font-medium">Leave Balances ledger (Casual, Sick)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOvertimeDetails}
                      onChange={(e) => setShowOvertimeDetails(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 font-medium">Overtime Hours & Pay Breakdown</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showNetSalaryInWords}
                      onChange={(e) => setShowNetSalaryInWords(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 font-medium">Net Salary in Words</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBarcodeOrQr}
                      onChange={(e) => setShowBarcodeOrQr(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 font-medium">Security Verification Badge / QR Code</span>
                  </label>
                </div>
              </div>

              {/* Authorized Signatory & Official Stamp */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Stamp className="w-4 h-4 text-indigo-600" />
                  <span>Authorized Signatory & Stamp</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1">Signatory Name</label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      placeholder="e.g. Johnathan Doe"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      placeholder="e.g. HR Director"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                {/* Signature Image Upload */}
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Digital Signature or Corporate Seal</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-12 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {signatureImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={signatureImageUrl} alt="Signature Stamp" className="max-h-full object-contain p-1" />
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">No stamp</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition">
                        {isUploadingSig ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        <span>Upload Stamp</span>
                        <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                      </label>
                      {signatureImageUrl && (
                        <button
                          onClick={() => setSignatureImageUrl(null)}
                          className="text-xs text-rose-600 hover:underline block font-semibold"
                        >
                          Clear stamp
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1">Declaration Statement</label>
                  <textarea
                    rows={2}
                    value={declarationText}
                    onChange={(e) => setDeclarationText(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Custom HTML Upload Mode */
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span>Custom HTML Template Upload</span>
              </h3>

              <p className="text-xs text-slate-500">
                Upload a custom HTML template or edit raw template markup. Dynamic fields use standard mustache syntax:
              </p>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono space-y-1">
                <p><span className="text-indigo-600 font-bold">{"{{companyName}}"}</span> - Organization Legal Name</p>
                <p><span className="text-indigo-600 font-bold">{"{{employeeName}}"}</span> - Employee Full Name</p>
                <p><span className="text-indigo-600 font-bold">{"{{periodLabel}}"}</span> - payroll period label</p>
                <p><span className="text-indigo-600 font-bold">{"{{netSalary}}"}</span> - Net Disbursed Pay</p>
                <p><span className="text-indigo-600 font-bold">{"{{netSalaryWords}}"}</span> - Amount in Words</p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Upload Template File (.html)</label>
                <input
                  type="file"
                  accept=".html,.htm,.hbs"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const text = await f.text();
                      setCustomHtml(text);
                      toast.success(`Loaded file: ${f.name}`);
                    }
                  }}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">HTML Template Code</label>
                <textarea
                  rows={12}
                  value={customHtml}
                  onChange={(e) => setCustomHtml(e.target.value)}
                  placeholder="<!DOCTYPE html><html><body><h1>{{companyName}}</h1>...</body></html>"
                  className="w-full text-xs p-3 font-mono rounded-xl border border-slate-200 bg-slate-900 text-cyan-300 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT LIVE A4 PRINTABLE PREVIEW (7 cols) ──────────────────────────── */}
        <div className="lg:col-span-7">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-3 px-1 print:hidden">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Live Interactive A4 Preview</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">Standard A4 Sheet Format</span>
            </div>

            {/* A4 Paper Frame */}
            <div
              ref={previewPrintRef}
              className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl print:p-0 print:border-none print:shadow-none min-h-[750px] flex flex-col justify-between"
              style={{ fontFamily: fontFamily || "Inter" }}
            >
              <div className="space-y-6">
                {/* 1. Header Layout based on selected style */}
                {headerLayout === "BANNER" ? (
                  <div
                    className="p-6 rounded-2xl text-white -mx-2 -mt-2 flex items-center justify-between"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <div className="flex items-center gap-3">
                      {logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-xl p-1 shrink-0" />
                      )}
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight">{companyName || "Acme Global Technologies"}</h2>
                        <p className="text-xs text-white/80">{addressLine1 || "Corporate Headquarters, Cyber City, Phase II"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-white/20 uppercase tracking-wider block mb-1">
                        Salary Slip
                      </span>
                      <span className="text-xs font-bold">{sampleData.period}</span>
                    </div>
                  </div>
                ) : headerLayout === "CENTERED" ? (
                  <div className="text-center pb-6 border-b-2" style={{ borderColor: primaryColor }}>
                    {logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-2" />
                    )}
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                      {companyName || "Acme Global Technologies"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {addressLine1 || "100 Cyber Tower, Tech Hub"} {addressLine2 ? `• ${addressLine2}` : ""}
                    </p>
                    <div className="inline-flex items-center gap-2 mt-2 px-3 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>
                      <span>Payslip for {sampleData.period}</span>
                    </div>
                  </div>
                ) : (
                  /* SPLIT DUAL LAYOUT */
                  <div className="flex items-start justify-between pb-6 border-b-2" style={{ borderColor: primaryColor }}>
                    <div>
                      <div className="flex items-center gap-2.5">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-xl shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 text-sm" style={{ backgroundColor: primaryColor }}>
                            {companyName ? companyName.charAt(0) : "W"}
                          </div>
                        )}
                        <div>
                          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                            {companyName || "Acme Global Technologies Pvt Ltd"}
                          </h2>
                          <p className="text-xs text-slate-500">
                            {addressLine1 || "Corporate Headquarters, Cyber City"} {addressLine2 ? `, ${addressLine2}` : ""}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {taxIdentifierLabel}: <span className="font-semibold text-slate-600">{taxIdentifierValue || "N/A"}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Monthly Payslip</h3>
                      <p className="text-xs font-bold" style={{ color: primaryColor }}>{sampleData.period}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{sampleData.payslipNo}</p>
                    </div>
                  </div>
                )}

                {/* 2. Employee Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-bold">Employee Name</span>
                    <span className="font-bold text-slate-900">{sampleData.employee.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-bold">Employee ID</span>
                    <span className="font-bold text-slate-900">{sampleData.employee.code}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-bold">Designation</span>
                    <span className="font-bold text-slate-900">{sampleData.employee.designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-bold">Department</span>
                    <span className="font-bold text-slate-900">{sampleData.employee.department}</span>
                  </div>

                  {showBankDetails && (
                    <>
                      <div>
                        <span className="text-slate-400 block text-xs uppercase font-bold">Bank Name</span>
                        <span className="font-bold text-slate-900">{sampleData.employee.bankName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-xs uppercase font-bold">Bank A/C No</span>
                        <span className="font-bold text-slate-900">{sampleData.employee.accountNumber}</span>
                      </div>
                    </>
                  )}

                  {showPanUan && (
                    <>
                      <div>
                        <span className="text-slate-400 block text-xs uppercase font-bold">PAN Number</span>
                        <span className="font-bold text-slate-900">{sampleData.employee.panNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-xs uppercase font-bold">UAN / PF No</span>
                        <span className="font-bold text-slate-900">{sampleData.employee.uanNumber}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 3. Attendance Metrics Bar */}
                {showAttendanceSummary && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 text-center p-3 rounded-xl border border-slate-200 text-xs bg-white">
                    <div>
                      <span className="text-xs text-slate-400 block">Working Days</span>
                      <span className="font-bold text-slate-900">{sampleData.attendance.workingDays}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Present</span>
                      <span className="font-bold text-emerald-600">{sampleData.attendance.presentDays}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Paid Leave</span>
                      <span className="font-bold text-indigo-600">{sampleData.attendance.paidLeaveDays}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Loss of Pay</span>
                      <span className="font-bold text-slate-900">{sampleData.attendance.unpaidLeaveDays}</span>
                    </div>
                    {showOvertimeDetails && (
                      <div>
                        <span className="text-xs text-slate-400 block">Overtime</span>
                        <span className="font-bold" style={{ color: primaryColor }}>{sampleData.attendance.overtimeHours} hrs</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Earnings & Deductions Ledger Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Earnings */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 font-bold border-b border-slate-200 flex justify-between">
                      <span className="text-slate-700">Earnings & Allowances</span>
                      <span className="text-slate-500">Amount (INR)</span>
                    </div>
                    <div className="divide-y divide-slate-100 p-2 space-y-1">
                      {sampleData.earnings.map((e, idx) => (
                        <div key={idx} className="flex justify-between px-2 py-1">
                          <span className="text-slate-600">{e.label}</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Total Gross Earnings</span>
                      <span style={{ color: primaryColor }}>{formatCurrency(sampleData.grossSalary)}</span>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 font-bold border-b border-slate-200 flex justify-between">
                      <span className="text-slate-700">Deductions & Taxes</span>
                      <span className="text-slate-500">Amount (INR)</span>
                    </div>
                    <div className="divide-y divide-slate-100 p-2 space-y-1">
                      {sampleData.deductions.map((d, idx) => (
                        <div key={idx} className="flex justify-between px-2 py-1">
                          <span className="text-slate-600">{d.label}</span>
                          <span className="font-semibold text-rose-600">{formatCurrency(d.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Total Deductions</span>
                      <span className="text-rose-600">{formatCurrency(sampleData.totalDeductions)}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Net Salary Take-Home Banner */}
                <div
                  className="rounded-2xl p-4 text-white flex flex-wrap items-center justify-between gap-4 shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  <div>
                    <span className="text-xs font-semibold text-white/80 block uppercase tracking-wider">
                      Net Take-Home Pay
                    </span>
                    <span className="text-2xl font-bold">{formatCurrency(sampleData.netSalary)}</span>
                    {showNetSalaryInWords && (
                      <p className="text-xs text-white/90 italic mt-0.5">{sampleData.netSalaryWords}</p>
                    )}
                  </div>

                  {showBarcodeOrQr && (
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl text-xs font-mono">
                      <QrCode className="w-5 h-5 text-white" />
                      <span>AUTHENTICATED • ID {sampleData.payslipNo.slice(-8)}</span>
                    </div>
                  )}
                </div>

                {/* 6. Leave Balance Ledger */}
                {showLeaveBalances && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between text-slate-600">
                    <span className="font-bold text-slate-800">Leave Balance as of Period End:</span>
                    <span>Casual Leave (CL): <strong>{sampleData.attendance.casualLeaveBalance} days</strong></span>
                    <span>Sick Leave (SL): <strong>{sampleData.attendance.sickLeaveBalance} days</strong></span>
                  </div>
                )}
              </div>

              {/* 7. Signatory & Legal Footer */}
              <div className="pt-8 border-t border-slate-200 space-y-4">
                <div className="flex items-end justify-between">
                  <div className="max-w-xs text-xs text-slate-500 leading-relaxed">
                    <p>{declarationText}</p>
                    <p className="mt-1 font-semibold">Support: {contactEmail || "payroll@company.com"}</p>
                  </div>

                  <div className="text-right space-y-1">
                    {signatureImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={signatureImageUrl} alt="Signature Stamp" className="h-10 object-contain ml-auto" />
                    )}
                    <div className="w-36 border-t border-slate-400 mt-2 pt-1">
                      <p className="text-xs font-bold text-slate-900">{signatoryName}</p>
                      <p className="text-xs text-slate-500">{signatoryTitle}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
