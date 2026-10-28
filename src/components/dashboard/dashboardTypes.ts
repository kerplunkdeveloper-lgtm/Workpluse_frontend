"use client";

import React from "react";













import { type RosterStatus } from "./dashboardMetrics";

export interface RosterPerson {
  id: string;
  name: string;
  employeeCode?: string;
  designation: string;
  department: string;
  checkInTime?: string;
  checkOutTime?: string;
  workMode?: "OFFICE" | "SHOOT" | "WORK_FROM_HOME";
  workingMinutes?: number;
  breakMinutes?: number;
  lunchMinutes?: number;
  location?: string | null;
  branchName?: string;
  status: RosterStatus;
}

export interface QuickAction {
  href: string;
  label: string;
  hint: string;
  icon: React.ElementType;
  tone: string;
  details: string[];
}
