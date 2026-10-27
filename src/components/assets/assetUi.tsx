"use client";




import { Laptop, MonitorCheck, Tv, Smartphone, Tablet, Headphones, KeyRound, Armchair, CarFront, Box } from "lucide-react";


import { AssetCategory, AssetStatus, AssetCondition } from "@/types";



export function getCategoryIcon(cat: AssetCategory) {
  switch (cat) {
    case "LAPTOP":
      return Laptop;
    case "DESKTOP":
      return MonitorCheck;
    case "MONITOR":
      return Tv;
    case "MOBILE_PHONE":
      return Smartphone;
    case "TABLET":
      return Tablet;
    case "HEADPHONES_PERIPHERALS":
      return Headphones;
    case "SECURITY_TOKEN_KEY":
      return KeyRound;
    case "OFFICE_FURNITURE":
      return Armchair;
    case "VEHICLE":
      return CarFront;
    default:
      return Box;
  }
}

export function getStatusBadge(status: AssetStatus) {
  switch (status) {
    case "AVAILABLE":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Available",
        dot: "bg-emerald-500",
      };
    case "ASSIGNED":
      return {
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        label: "Assigned",
        dot: "bg-blue-500",
      };
    case "UNDER_MAINTENANCE":
      return {
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Under Maintenance",
        dot: "bg-amber-500 animate-pulse",
      };
    case "DAMAGED":
      return {
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        label: "Damaged",
        dot: "bg-rose-500",
      };
    case "RETIRED":
      return {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        label: "Retired",
        dot: "bg-gray-500",
      };
    case "LOST":
      return {
        bg: "bg-purple-50 text-purple-700 border-purple-200",
        label: "Lost",
        dot: "bg-purple-500",
      };
    default:
      return {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        label: status,
        dot: "bg-gray-400",
      };
  }
}

export function getConditionBadge(condition: AssetCondition) {
  switch (condition) {
    case "NEW":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "EXCELLENT":
      return "bg-teal-50 text-teal-700 border-teal-200";
    case "GOOD":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "FAIR":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "DAMAGED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}
