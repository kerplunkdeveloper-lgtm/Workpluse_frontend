"use client";



import { unwrapList } from "@/lib/utils";



import { Person } from "./chatTypes";

/* ── Helpers ────────────────────────────────────────────────────────────── */

export const PAGE_SIZE = 30;

export const MESSAGE_PAGE_SIZE = 50;

export const MAX_MESSAGE_LENGTH = 4000;

export const toList = <T,>(val: unknown): T[] => {
  const v = val as any;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data?.records)) return v.data.records;
  if (Array.isArray(v?.records)) return v.records;
  if (Array.isArray(v?.data)) return v.data;
  const list = unwrapList<T>(val);
  return Array.isArray(list) ? list : [];
};

export const metaOf = (val: unknown): { totalPages: number; total: number } => {
  const v = val as any;
  const d = v?.data && !Array.isArray(v.data) ? v.data : v;
  return { totalPages: Number(d?.totalPages) || 1, total: Number(d?.total) || 0 };
};

export const personName = (u?: Person | null) => {
  const full = `${u?.employee?.firstName || ""} ${u?.employee?.lastName || ""}`.trim();
  return full || u?.email || "Teammate";
};

export const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || "?").slice(0, 2).toUpperCase();
};

export const roleLabel = (role?: string) =>
  role === "COMPANY_ADMIN" || role === "SUPER_ADMIN" ? "Admin" : role === "MANAGER" ? "HR" : role ? "Employee" : "";

export const timeOf = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const dayLabel = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};
