import type { MarketingPage } from "./MarketingSolutionPage";

export const MARKETING_PAGES: Record<string, MarketingPage> = {
  hrms: {
    eyebrow: "All-in-one HRMS software",
    title: "HRMS software that keeps every people operation in rhythm",
    intro: "Clocked gives growing businesses one workspace for attendance, leave, employees, onboarding, shifts and payroll-ready records.",
    proof: "Built for multi-branch teams, field operations and India-first payroll workflows.",
    benefits: ["One employee record across HR workflows", "Attendance, leave and approvals in one workspace", "Payroll-ready records with an auditable trail"],
    workflows: [
      { title: "Set up your organization", body: "Create branches, departments, working hours, geofences, shifts and policies from one guided workspace." },
      { title: "Run the workday", body: "Employees punch from a phone browser or companion app while HR sees attendance, leave and workforce status." },
      { title: "Close the month", body: "Review exceptions, approve requests and carry clean attendance data into payroll and reports." },
    ],
    related: [{ href: "/employee-attendance-software", label: "Attendance" }, { href: "/payroll-software", label: "Payroll" }, { href: "/employee-management-software", label: "Employee management" }],
  },
  attendance: {
    eyebrow: "Employee attendance software",
    title: "Attendance software for offices, branches and teams on the move",
    intro: "Clocked turns daily punch-ins into reliable attendance records with branch-aware rules, shift schedules, offline sync and clear exception review.",
    proof: "Track presence without forcing every team into the same work pattern.",
    benefits: ["Live present, remote, leave and late-arrival views", "Offline-first punches keep original timestamps", "Shift, grace-period and branch rules stay together"],
    workflows: [
      { title: "Define the attendance policy", body: "Configure working hours, weekly offs, shifts, grace periods and branch rules for each workforce group." },
      { title: "Capture every punch", body: "Employees punch from supported browsers or the companion app. Offline punches sync when connectivity returns." },
      { title: "Resolve exceptions", body: "Managers can inspect attendance history, corrections, locations and late arrivals before records move forward." },
    ],
    related: [{ href: "/gps-attendance-software", label: "GPS attendance" }, { href: "/leave-management-software", label: "Leave management" }, { href: "/hrms-software", label: "HRMS" }],
  },
  payroll: {
    eyebrow: "Payroll software",
    title: "Payroll software built from the attendance you already trust",
    intro: "Clocked connects attendance, leave, overtime and employee records so payroll teams can review payroll-ready data without spreadsheet drift.",
    proof: "PF, ESI, tax, overtime, loss-of-pay and payslip workflows are supported in the product.",
    benefits: ["Attendance and leave inputs stay connected to payroll", "Overtime, comp-off and loss-of-pay workflows", "Payslips, statutory exports and audit-friendly approvals"],
    workflows: [
      { title: "Keep workforce data current", body: "Manage employee profiles, salary structures, documents, branches and roles in the same system." },
      { title: "Review the pay inputs", body: "Use attendance, leave, overtime and policy records to identify exceptions before payroll processing." },
      { title: "Generate and share", body: "Create payslips and payroll-ready records while keeping review decisions visible to authorized users." },
    ],
    related: [{ href: "/hrms-software", label: "HRMS" }, { href: "/employee-attendance-software", label: "Attendance" }, { href: "/pricing", label: "Plans" }],
  },
  leave: {
    eyebrow: "Leave management software",
    title: "Leave management that keeps people and payroll aligned",
    intro: "Employees apply for leave, managers review requests and HR keeps balances, calendars and payroll inputs in one auditable workflow.",
    proof: "Support planned, emergency, half-day and approval-based leave workflows.",
    benefits: ["Clear leave balances and request status", "Manager and HR approvals with review history", "Approved leave flows into attendance and payroll context"],
    workflows: [
      { title: "Define leave policy", body: "Create leave types, permissions, waiting periods, weekly-off rules and approval chains for your organization." },
      { title: "Make requests simple", body: "Employees submit planned or emergency leave with dates, portions and supporting context from the workspace." },
      { title: "Approve with confidence", body: "Managers and HR see team coverage, request history and the impact on attendance records before deciding." },
    ],
    related: [{ href: "/employee-attendance-software", label: "Attendance" }, { href: "/payroll-software", label: "Payroll" }, { href: "/hrms-software", label: "HRMS" }],
  },
  gps: {
    eyebrow: "GPS attendance software",
    title: "GPS attendance software for distributed and field teams",
    intro: "Use branch geofences and punch-location evidence to make on-site attendance clearer for factories, retail, construction and field operations.",
    proof: "Branch-specific radii, location labels and audited punch activity are part of Clocked attendance workflows.",
    benefits: ["Set a geofence and radius for each branch", "Review punch locations and location labels", "Combine GPS controls with offline-ready attendance"],
    workflows: [
      { title: "Map every work location", body: "Create branches and set the office location and allowed radius for the teams assigned there." },
      { title: "Punch with context", body: "Employees punch from supported devices while Clocked records the attendance context available for the workflow." },
      { title: "Audit exceptions", body: "Managers can review location-aware attendance records and keep corrections inside the approval trail." },
    ],
    related: [{ href: "/employee-attendance-software", label: "Attendance" }, { href: "/employee-management-software", label: "Employee management" }, { href: "/pricing", label: "Plans" }],
  },
  employees: {
    eyebrow: "Employee management software",
    title: "Employee management software for a workforce that keeps changing",
    intro: "Clocked gives HR a dependable employee directory with roles, departments, branches, documents, onboarding and access workflows.",
    proof: "Invite, organize and support employees without maintaining disconnected spreadsheets.",
    benefits: ["Employee profiles, roles, departments and branches", "Onboarding invitations and document workflows", "Role-based access and organization-level separation"],
    workflows: [
      { title: "Build the directory", body: "Add employees individually or through bulk import, then assign departments, branches, designations and shifts." },
      { title: "Complete onboarding", body: "Send secure invitations, collect required profile information and manage documents from the employee record." },
      { title: "Keep access controlled", body: "Use role checks, organization isolation and audit records to keep workforce information within the right teams." },
    ],
    related: [{ href: "/hrms-software", label: "HRMS" }, { href: "/employee-attendance-software", label: "Attendance" }, { href: "/leave-management-software", label: "Leave management" }],
  },
};
