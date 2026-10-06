"use client";

import Link from "next/link";
import { Check, ShieldCheck, UserCog, UserRound, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

type Role = "COMPANY_ADMIN" | "MANAGER" | "EMPLOYEE";
/** true = full access, false = none, string = limited access described in words */
type Access = boolean | string;

const roles: {
  id: Role;
  label: string;
  who: string;
  summary: string;
  icon: typeof ShieldCheck;
  tone: string;
  chip: string;
}[] = [
  {
    id: "COMPANY_ADMIN",
    label: "Company admin",
    who: "Owner of this workspace",
    summary: "Full control: subscription and invoices, API keys, branches, departments, policies, roles and payroll approval.",
    icon: ShieldCheck,
    tone: "from-indigo-500 to-indigo-700",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    id: "MANAGER",
    label: "HR",
    who: "Your HR team",
    summary: "Runs the people side day to day: employee records, attendance review, leave approvals, onboarding and preparing payroll.",
    icon: UserCog,
    tone: "from-amber-500 to-amber-600",
    chip: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    id: "EMPLOYEE",
    label: "Employee",
    who: "Everyone else",
    summary: "Self-service: punch in and out, apply for leave, request corrections, see their own payslips and documents.",
    icon: UserRound,
    tone: "from-slate-500 to-slate-700",
    chip: "bg-slate-100 text-slate-700 border-slate-200",
  },
];

const permissions: { module: string; description: string; access: Record<Role, Access> }[] = [
  {
    module: "Dashboard & my profile",
    description: "Personal attendance, profile and assigned work",
    access: { COMPANY_ADMIN: true, MANAGER: true, EMPLOYEE: true },
  },
  {
    module: "Punch, leave & corrections",
    description: "Mark attendance, apply for leave, request corrections",
    access: { COMPANY_ADMIN: true, MANAGER: true, EMPLOYEE: true },
  },
  {
    module: "Employee directory",
    description: "View and manage employee records",
    access: { COMPANY_ADMIN: true, MANAGER: "Cannot change roles", EMPLOYEE: false },
  },
  {
    module: "Roles & user access",
    description: "Assign roles, switch logins on or off",
    access: { COMPANY_ADMIN: true, MANAGER: false, EMPLOYEE: false },
  },
  {
    module: "Attendance review",
    description: "Review team attendance, locations and corrections",
    access: { COMPANY_ADMIN: true, MANAGER: true, EMPLOYEE: false },
  },
  {
    module: "Leave & approvals",
    description: "Approve requests. HR requests are approved by an admin",
    access: { COMPANY_ADMIN: true, MANAGER: "Employee requests", EMPLOYEE: false },
  },
  {
    module: "Onboarding & offboarding",
    description: "Hire, document and exit people",
    access: { COMPANY_ADMIN: true, MANAGER: true, EMPLOYEE: false },
  },
  {
    module: "Payroll & statutory",
    description: "Prepare payroll, approve and lock the month, view payslips",
    access: { COMPANY_ADMIN: "Approve & lock", MANAGER: "Prepare & view", EMPLOYEE: "Own payslips" },
  },
  {
    module: "Reports & audit logs",
    description: "Muster roll, exports and organization activity history",
    access: { COMPANY_ADMIN: true, MANAGER: true, EMPLOYEE: false },
  },
  {
    module: "Branches & departments",
    description: "Create and edit locations, geofences and structure",
    access: { COMPANY_ADMIN: true, MANAGER: "View only", EMPLOYEE: false },
  },
  {
    module: "Policies & organization settings",
    description: "Attendance rules, company profile and holidays",
    access: { COMPANY_ADMIN: true, MANAGER: "Holidays only", EMPLOYEE: false },
  },
  {
    module: "Subscription & invoices",
    description: "Your WorkPulse plan, payments and receipts",
    access: { COMPANY_ADMIN: true, MANAGER: false, EMPLOYEE: false },
  },
  {
    module: "API keys & integrations",
    description: "Connect other systems to your workspace",
    access: { COMPANY_ADMIN: true, MANAGER: false, EMPLOYEE: false },
  },
];

function Cell({ value }: { value: Access }) {
  if (value === true) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100" title="Full access">
        <Check aria-hidden="true" className="h-4 w-4" />
        <span className="sr-only">Full access</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="text-slate-300" aria-label="No access">
        &mdash;
      </span>
    );
  }
  return <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 ring-1 ring-sky-100">{value}</span>;
}

export default function PermissionsView() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <PageHeader icon={ShieldCheck} title="Permissions" description="What each role can do in your workspace." />

      <section aria-label="Roles" className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => (
          <article key={role.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-3">
              <span className={`keep-white flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md ${role.tone}`}>
                <role.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-serif text-lg font-semibold leading-tight text-slate-950">{role.label}</h2>
                <p className="text-xs text-slate-500">{role.who}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{role.summary}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-950">Access by area</h2>
            <p className="text-xs text-slate-500">These rules are enforced by the server, not just hidden in the menu.</p>
          </div>
          <Link
            href="/employees"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.98]"
          >
            <Users className="h-3.5 w-3.5" />
            Manage user roles
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th scope="col" className="px-5 py-3.5">Workspace area</th>
                {roles.map((role) => (
                  <th key={role.id} scope="col" className="px-4 py-3.5 text-center">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold normal-case tracking-normal ${role.chip}`}>{role.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissions.map((permission) => (
                <tr key={permission.module} className="transition hover:bg-slate-50/70">
                  <th scope="row" className="px-5 py-4 text-left font-normal">
                    <p className="font-bold text-slate-900">{permission.module}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{permission.description}</p>
                  </th>
                  {roles.map((role) => (
                    <td key={role.id} className="px-4 py-4 text-center">
                      <Cell value={permission.access[role.id]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="rounded-2xl bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-600">
        WorkPulse itself, the company that provides this software, manages plan pricing and platform settings across all customers. That access is separate from your workspace and
        does not include your employee, attendance or payroll data.
      </p>
    </div>
  );
}
