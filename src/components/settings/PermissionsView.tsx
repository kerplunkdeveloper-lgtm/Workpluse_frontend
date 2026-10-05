"use client";

import Link from "next/link";
import { Check, ShieldCheck, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

type Role = "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER" | "EMPLOYEE";

const roles: { id: Role; label: string; tone: string }[] = [
  { id: "SUPER_ADMIN", label: "Super Admin", tone: "bg-violet-50 text-violet-700 border-violet-200" },
  { id: "COMPANY_ADMIN", label: "Company Admin", tone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "MANAGER", label: "Manager", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "EMPLOYEE", label: "Employee", tone: "bg-slate-100 text-slate-700 border-slate-200" },
];

const permissions: { module: string; description: string; allowed: Role[] }[] = [
  { module: "Dashboard & profile", description: "View personal attendance, profile, and assigned work", allowed: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "EMPLOYEE"] },
  { module: "Employee directory", description: "View and manage employee records", allowed: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
  { module: "Departments & branches", description: "Manage organization structure and locations", allowed: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
  { module: "Attendance review", description: "Review team attendance, corrections, and locations", allowed: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
  { module: "Leave & approvals", description: "Review requests and maintain leave configuration", allowed: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
  { module: "Payroll & statutory", description: "View payroll workflows and compliance records", allowed: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "EMPLOYEE"] },
  { module: "Billing & API keys", description: "Manage subscription and integrations", allowed: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
  { module: "Audit logs", description: "Review organization activity history", allowed: ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"] },
];

export default function PermissionsView() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="Permissions"
        description="Review the access provided by each WorkPulse role in this workspace."
      />

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-indigo-950">Role-based access is active</p>
            <p className="text-xs text-indigo-800 mt-1">Assign a role to control access. Custom per-user permissions are not enabled yet.</p>
          </div>
        </div>
        <Link href="/employees" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 whitespace-nowrap">
          <Users className="w-3.5 h-3.5" />
          Manage user roles
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 font-bold text-slate-900">Workspace area</th>
                {roles.map((role) => (
                  <th key={role.id} className="px-4 py-4 text-center">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${role.tone}`}>{role.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissions.map((permission) => (
                <tr key={permission.module} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{permission.module}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{permission.description}</p>
                  </td>
                  {roles.map((role) => (
                    <td key={role.id} className="px-4 py-4 text-center">
                      {permission.allowed.includes(role.id) ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600" title="Allowed">
                          <Check className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="text-slate-300" aria-label="Not allowed">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
