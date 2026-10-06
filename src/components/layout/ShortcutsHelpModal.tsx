"use client";

import React, { useEffect } from "react";
import { X, Command, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ShortcutItem {
  label: string;
  keys?: string[];
  action?: () => void;
  link?: string;
}

interface ShortcutCategory {
  category: string;
  items: ShortcutItem[];
}

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar: () => void;
}

export default function ShortcutsHelpModal({
  isOpen,
  onClose,
  onOpenCommandPalette,
  onToggleSidebar,
}: ShortcutsHelpModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const shortcuts: ShortcutCategory[] = [
    {
      category: "Global Navigation",
      items: [
        { label: "Open Command Palette / Search", keys: ["Ctrl", "K"], action: onOpenCommandPalette },
        { label: "Toggle Sidebar Collapse", keys: ["Ctrl", "B"], action: onToggleSidebar },
        { label: "Focus Sidebar Menu Filter", keys: ["/"] },
        { label: "Keyboard Shortcuts Guide", keys: ["?"] },
        { label: "Close Any Modal / Dialog", keys: ["Esc"], action: onClose },
      ],
    },
    {
      category: "Command Palette Navigation",
      items: [
        { label: "Navigate results", keys: ["↑", "↓"] },
        { label: "Select active result", keys: ["Enter"] },
        { label: "Clear search or dismiss", keys: ["Esc"] },
      ],
    },
    {
      category: "Quick Actions",
      items: [
        { label: "Today's Attendance & Punch", link: "/attendance" },
        { label: "Apply for Leave / Time Off", link: "/leaves" },
        { label: "View Salary & Payslips", link: "/payroll" },
        { label: "Employee Directory", link: "/employees" },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <Command className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    Keyboard Shortcuts & Navigation
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-700">
                      <Sparkles className="w-3 h-3" /> Pro
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">Speed up your workflow in WorkPulse</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close shortcuts"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5 text-xs">
              {shortcuts.map((sec) => (
                <div key={sec.category} className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {sec.category}
                  </h4>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 divide-y divide-slate-100 overflow-hidden">
                    {sec.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3.5 py-2 hover:bg-white transition"
                      >
                        <span className="text-slate-700 font-medium">{item.label}</span>
                        {item.keys && (
                          <div className="flex items-center gap-1">
                            {item.keys.map((k, kIdx) => (
                              <kbd
                                key={kIdx}
                                className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md shadow-2xs min-w-[20px] text-center"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        )}
                        {item.link && (
                          <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {item.link}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>WorkPulse Enterprise Edition</span>
              <span>Press <kbd className="px-1 py-0.5 text-xs font-mono bg-white border border-slate-200 rounded">Esc</kbd> to dismiss</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
