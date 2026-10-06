import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Pull a list out of any backend envelope ({ data }, { records }, nested, or a bare array). */
export function unwrapList<T = any>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  const candidates = [
    res.data,
    res.records,
    res.notifications,
    res.transactions,
    res.history,
    res.leaveRequests,
    res.corrections,
    res.overtimeRequests,
    res.requests,
    res.claims,
    res.employees,
    res.holidays,
    res.payslips,
    res.balances,
    res.items,
    res.departments,
    res.devices,
    res.logs,
    res.overrides,
    res.shifts,
    res.branches,
    res.candidates,
    res.people,
    res.teammates,
    res.threads,
    res.messages,
    res.users,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  if (res.data && typeof res.data === "object") {
    for (const c of [
      res.data.records,
      res.data.notifications,
      res.data.transactions,
      res.data.payslips,
      res.data.items,
      res.data.teammates,
      res.data.threads,
      res.data.messages,
      res.data.users,
    ]) {
      if (Array.isArray(c)) return c;
    }
  }
  return [];
}

/** Pull a single object out of { data } / { policy } / extra keys. */
export function unwrapItem<T = any>(res: any, extraKeys: string[] = []): T | null {
  if (!res) return null;
  for (const k of ["data", "policy", ...extraKeys]) {
    if (res[k] !== undefined && res[k] !== null && typeof res[k] === "object" && !Array.isArray(res[k])) {
      return res[k] as T;
    }
  }
  return null;
}

export function formatCurrency(amount: number | string | undefined | null, currency = "INR"): string {
  if (amount === undefined || amount === null) return "₹0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(dateString?: string | null, formatPattern = "dd MMM yyyy"): string {
  if (!dateString) return "-";
  try {
    const d = typeof dateString === "string" ? parseISO(dateString) : new Date(dateString);
    return format(d, formatPattern);
  } catch {
    return dateString;
  }
}

export function formatTime(timeValue?: string | Date | number | null): string {
  if (!timeValue) return "-";
  try {
    if (timeValue instanceof Date) {
      return isNaN(timeValue.getTime()) ? "-" : format(timeValue, "hh:mm a");
    }
    const str = String(timeValue).trim();
    if (!str || str === "null" || str === "undefined" || str === "-") return "-";

    // If it's already a formatted time like "09:30 AM" or "9:30 PM"
    if (/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(str)) {
      return str.toUpperCase();
    }

    // ISO timestamp or standard date-time string
    if (str.includes("T") || str.includes("-") || str.includes("/")) {
      const d = parseISO(str);
      if (!isNaN(d.getTime())) {
        return format(d, "hh:mm a");
      }
      const directDate = new Date(str);
      if (!isNaN(directDate.getTime())) {
        return format(directDate, "hh:mm a");
      }
    }

    // If numeric timestamp
    const num = Number(str);
    if (!isNaN(num) && num > 1000000000) {
      const d = new Date(num);
      if (!isNaN(d.getTime())) {
        return format(d, "hh:mm a");
      }
    }

    return str;
  } catch {
    return String(timeValue || "-");
  }
}

/** Customer-facing role names. The stored values (MANAGER etc.) never change. */
export function roleLabel(role?: string | null): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Platform owner";
    case "COMPANY_ADMIN":
      return "Company admin";
    case "MANAGER":
      return "HR";
    case "EMPLOYEE":
      return "Employee";
    default:
      return role ? String(role).replace(/_/g, " ").toLowerCase() : "";
  }
}

export function formatDurationMinutes(minutes: number): string {
  const total = Math.round(Number(minutes) || 0);
  if (total <= 0) return "0 min";
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} min`;
  if (hrs > 0) return `${hrs} hr`;
  return `${mins} min`;
}

// Haversine formula to compute distance in meters between 2 GPS coordinates
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
