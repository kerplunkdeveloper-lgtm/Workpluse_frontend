"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Building2, Mail, Lock, ArrowRight, Loader2, User } from "lucide-react";
import AuthShell from "@/components/ui/AuthShell";
import { authFieldRing } from "@/components/ui/MarketingAuthLayout";
import { toast } from "sonner";

export default function RegisterPage() {
  const { register } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("FREE_TRIAL");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    if (planParam && ["FREE_TRIAL", "STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(planParam)) {
      setSubscriptionPlan(planParam);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOrgName = orgName.trim();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanOrgName.length < 2) {
      toast.error("Organization name must be at least 2 characters.");
      return;
    }
    if (!cleanFirstName) {
      toast.error("First name is required.");
      return;
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("Password must be at least 8 characters and contain a letter and a number.");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        organizationName: cleanOrgName,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        email: cleanEmail,
        password,
        subscriptionPlan,
        billingCycle: "MONTHLY",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputWrap = (name: string) =>
    `flex items-center gap-3 rounded-full border bg-[#ffffff] px-4 py-2.5 transition-all ${authFieldRing(focused === name)}`;

  return (
    <AuthShell
      wide
      eyebrow="Create workspace"
      title="Start a free trial"
      description="Every workspace starts with 14 days and 10 employees. Paid plans unlock after checkout."
      asideTitle="Stand up a workspace in minutes."
      asideDescription="Invite the team, clock the day, and keep payroll ready from day one."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="mb-1.5 block text-[12px] font-bold text-slate-600">Organization name</label>
          <div className={inputWrap("org")}>
            <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Technologies"
              onFocus={() => setFocused("org")}
              onBlur={() => setFocused(null)}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-300"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-slate-600">First name</label>
            <div className={inputWrap("first")}>
              <User className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onFocus={() => setFocused("first")}
                onBlur={() => setFocused(null)}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-slate-600">Last name</label>
            <div className={inputWrap("last")}>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onFocus={() => setFocused("last")}
                onBlur={() => setFocused(null)}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-bold text-slate-600">Work email</label>
          <div className={inputWrap("email")}>
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-300"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-bold text-slate-600">Password</label>
          <div className={inputWrap("password")}>
            <Lock className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              autoComplete="new-password"
              minLength={8}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-bold text-slate-600">Preferred plan</label>
          <div className={inputWrap("plan")}>
            <select
              value={subscriptionPlan}
              onChange={(e) => setSubscriptionPlan(e.target.value)}
              onFocus={() => setFocused("plan")}
              onBlur={() => setFocused(null)}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
            >
              <option value="FREE_TRIAL">Free trial — 14 days, 10 employees</option>
              <option value="STARTER">Starter after trial — 25 employees</option>
              <option value="PROFESSIONAL">Professional after trial — 100 employees</option>
              <option value="ENTERPRISE">Enterprise after trial — 10,000 employees</option>
            </select>
          </div>
          {subscriptionPlan !== "FREE_TRIAL" && (
            <p className="mt-1.5 text-[11px] text-slate-500">
              You will start on the trial, then we will open checkout for {subscriptionPlan.toLowerCase()}.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="keep-white mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,0.7)] transition hover:bg-blue-500 active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Create workspace
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
