"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  X,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Check,
  RotateCcw,
  Loader2,
  Trash2,
  Palette,
  Layers,
} from "lucide-react";
import {
  PRESET_ICONS,
  PRESET_THEMES,
  PresetIcon,
  PresetTheme,
  detectDefaultDepartmentStyle,
  DepartmentStyle,
  ICON_MAP,
} from "@/lib/departmentVisuals";

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    style: DepartmentStyle;
  }) => Promise<void>;
  initialData?: {
    id?: string;
    name?: string;
    style?: DepartmentStyle;
  } | null;
  existingNames?: string[];
}

export default function DepartmentModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingNames = [],
}: DepartmentModalProps) {
  const [name, setName] = useState("");
  const [selectedIconId, setSelectedIconId] = useState<string>("sparkles");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("indigo");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [activeTab, setActiveTab] = useState<"icons" | "upload" | "theme">("icons");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const modalTitleId = useId();

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialData?.name) {
        setName(initialData.name);
        if (initialData.style) {
          setSelectedIconId(initialData.style.iconId || "sparkles");
          setSelectedThemeId(initialData.style.themeId || "indigo");
          setImageUrl(initialData.style.imageUrl || "");
          setIsManualOverride(true);
        } else {
          const auto = detectDefaultDepartmentStyle(initialData.name);
          setSelectedIconId(auto.iconId);
          setSelectedThemeId(auto.themeId);
          setImageUrl("");
          setIsManualOverride(false);
        }
      } else {
        setName("");
        const auto = detectDefaultDepartmentStyle("");
        setSelectedIconId(auto.iconId);
        setSelectedThemeId(auto.themeId);
        setImageUrl("");
        setIsManualOverride(false);
      }
      setTimeout(() => nameInputRef.current?.focus(), 80);
    }
  }, [isOpen, initialData]);

  // Handle typing name: auto-detect icon & theme if not manually locked
  const handleNameChange = (val: string) => {
    setName(val);
    setError(null);
    if (!isManualOverride && !imageUrl) {
      const auto = detectDefaultDepartmentStyle(val);
      setSelectedIconId(auto.iconId);
      setSelectedThemeId(auto.themeId);
    }
  };

  const handleResetToAuto = () => {
    setIsManualOverride(false);
    setImageUrl("");
    const auto = detectDefaultDepartmentStyle(name);
    setSelectedIconId(auto.iconId);
    setSelectedThemeId(auto.themeId);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, SVG, WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size should be under 2MB for fast loading.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
        setIsManualOverride(true);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const currentTheme =
    PRESET_THEMES.find((t) => t.id === selectedThemeId) || PRESET_THEMES[0];
  const CurrentIcon = ICON_MAP[selectedIconId] || Sparkles;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Department name is required.");
      return;
    }

    // Check duplicate
    const isEditingCurrent =
      initialData?.name &&
      initialData.name.toLowerCase() === cleanName.toLowerCase();
    if (
      !isEditingCurrent &&
      existingNames.some((n) => n.toLowerCase() === cleanName.toLowerCase())
    ) {
      setError(`A department named "${cleanName}" already exists.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: cleanName,
        style: {
          iconId: selectedIconId,
          themeId: selectedThemeId,
          imageUrl: imageUrl.trim() || undefined,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save department. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:p-6"
      onClick={() => !saving && onClose()}
      onKeyDown={(e) => e.key === "Escape" && !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${currentTheme.gradient} text-white shadow-md ${currentTheme.shadow}`}
            >
              <CurrentIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 id={modalTitleId} className="text-base font-bold text-slate-900">
                {initialData?.id ? "Edit Department" : "Add New Department"}
              </h2>
              <p className="text-xs text-slate-500">
                Customize department visual branding & relation icon
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Live Preview Card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Live Card Preview
              </label>
              {!isManualOverride && !imageUrl && name.trim() && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3" /> Auto-matched by relation
                </span>
              )}
              {(isManualOverride || imageUrl) && (
                <button
                  type="button"
                  onClick={handleResetToAuto}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600 transition"
                  title="Reset to intelligent automatic domain detection"
                >
                  <RotateCcw className="h-3 w-3" /> Reset to auto-detect
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-start gap-3.5">
                {/* Badge / Avatar Position */}
                <div
                  className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${
                    imageUrl
                      ? "bg-slate-100 border border-slate-200"
                      : `bg-gradient-to-br ${currentTheme.gradient} text-white shadow-md ${currentTheme.shadow}`
                  }`}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={name || "Department preview"}
                      className="h-full w-full object-cover rounded-2xl"
                    />
                  ) : (
                    <CurrentIcon className="h-6 w-6 stroke-[2]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-slate-900">
                    {name.trim() || "Department Name"}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    0 employees assigned • Sample share
                  </p>
                </div>
              </div>

              {/* Workforce Bar Preview */}
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Share of workforce</span>
                  <span className="tabular-nums text-slate-700">100%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${currentTheme.progressGradient}`}
                    style={{ width: "65%" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Department Name Input */}
          <div>
            <label
              htmlFor="dept-modal-name"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="dept-modal-name"
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Engineering, Sales, Human Resources, Finance"
              maxLength={80}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-xs transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-50"
            />
          </div>

          {/* Visual Customization Tabs */}
          <div>
            <div className="flex border-b border-slate-200 gap-6">
              <button
                type="button"
                onClick={() => setActiveTab("icons")}
                className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition border-b-2 ${
                  activeTab === "icons"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Layers className="h-4 w-4" /> Preset Icons
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition border-b-2 ${
                  activeTab === "upload"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Upload className="h-4 w-4" /> Upload Custom Image
                {imageUrl && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("theme")}
                className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition border-b-2 ${
                  activeTab === "theme"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Palette className="h-4 w-4" /> Color Palette
              </button>
            </div>

            {/* TAB CONTENT: PRESET ICONS */}
            {activeTab === "icons" && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-500">
                  Select a domain icon for this department position:
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-48 overflow-y-auto p-1">
                  {PRESET_ICONS.map((item: PresetIcon) => {
                    const Icon = item.icon;
                    const isSelected = selectedIconId === item.id && !imageUrl;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedIconId(item.id);
                          setImageUrl(""); // Clear custom image when choosing icon
                          setIsManualOverride(true);
                        }}
                        title={item.label}
                        className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border transition ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/80 text-indigo-600 shadow-xs ring-2 ring-indigo-500/20"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium truncate max-w-full">
                          {item.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: UPLOAD CUSTOM IMAGE */}
            {activeTab === "upload" && (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-500">
                  Upload an official logo or custom illustration (SVG, PNG, JPG) to display in the department position.
                </p>

                {imageUrl ? (
                  <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Uploaded preview"
                      className="h-14 w-14 rounded-2xl object-cover border border-emerald-300 bg-white shadow-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" /> Custom image active
                      </p>
                      <p className="text-[11px] text-emerald-600 truncate mt-0.5">
                        Displayed on the department card
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl("");
                          setIsManualOverride(false);
                          const auto = detectDefaultDepartmentStyle(name);
                          setSelectedIconId(auto.iconId);
                          setSelectedThemeId(auto.themeId);
                        }}
                        className="rounded-xl border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                        title="Remove custom image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50/20"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
                      <ImageIcon className="h-5 w-5" />
                    </span>
                    <p className="text-xs font-bold text-slate-800">
                      Click to upload image or drag & drop
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supports PNG, JPG, WebP, SVG up to 2MB
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Direct URL input alternative */}
                <div>
                  <label
                    htmlFor="custom-image-url-input"
                    className="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Or paste Image URL:
                  </label>
                  <input
                    id="custom-image-url-input"
                    type="url"
                    value={imageUrl.startsWith("data:") ? "" : imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setIsManualOverride(true);
                    }}
                    placeholder="https://example.com/department-icon.png"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
            )}

            {/* TAB CONTENT: THEME */}
            {activeTab === "theme" && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-500">
                  Select a gradient color scheme for the card badge and progress bar:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_THEMES.map((theme: PresetTheme) => {
                    const isSelected = selectedThemeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setSelectedThemeId(theme.id);
                          setIsManualOverride(true);
                        }}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`h-6 w-6 shrink-0 rounded-lg bg-gradient-to-br ${theme.gradient} shadow-xs flex items-center justify-center text-white`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {theme.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:shadow-none"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving
                ? "Saving..."
                : initialData?.id
                ? "Save Changes"
                : "Create Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
