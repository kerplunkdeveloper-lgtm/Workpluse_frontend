"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Building2, Mail, Lock, ArrowRight, Loader2, User, Eye, EyeOff, Check, ChevronDown } from "lucide-react";
import AuthShell, {
  authIcon,
  authInput,
  authInputWrap,
  authLabel,
  authPrimaryButton,
} from "@/components/ui/AuthShell";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import type { SubscriptionPlan, SubscriptionPlanOption } from "@/types";

type FieldName = "org" | "first" | "email" | "password";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const passwordRules = (value: string) => [
  { label: "At least 8 characters", met: value.length >= 8 },
  { label: "Contains a letter", met: /[a-zA-Z]/.test(value) },
  { label: "Contains a number", met: /[0-9]/.test(value) },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>("FREE_TRIAL");
  const [plans, setPlans] = useState<SubscriptionPlanOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    if (planParam && ["FREE_TRIAL", "STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(planParam)) {
      void Promise.resolve().then(() => setSubscriptionPlan(planParam as SubscriptionPlan));
    }
    authApi.getPlans()
      .then((response) => setPlans(Array.isArray(response?.plans) ? response.plans : []))
      .catch(() => toast.error("Plan details could not be loaded. Please refresh and try again."));
  }, []);

  const fieldIds: Record<FieldName, string> = {
    org: "register-organization",
    first: "register-first-name",
    email: "register-email",
    password: "register-password",
  };

  const validateFields = (): Partial<Record<FieldName, string>> => {
    const next: Partial<Record<FieldName, string>> = {};
    if (orgName.trim().length < 2) next.org = "Enter your organization name (at least 2 characters).";
    if (!firstName.trim()) next.first = "Enter your first name.";
    if (!EMAIL_PATTERN.test(email.trim())) next.email = "Enter a valid work email, like name@company.com.";
    if (!passwordRules(password).every((rule) => rule.met)) next.password = "Password does not meet all the requirements below.";
    return next;
  };

  const validateOne = (name: FieldName) => {
    const message = validateFields()[name];
    setErrors((current) => ({ ...current, [name]: message }));
  };

  const fieldError = (name: FieldName) =>
    errors[name] ? (
      <p id={`${fieldIds[name]}-error`} role="alert" className="mt-1.5 text-[12px] font-medium text-rose-600">
        {errors[name]}
      </p>
    ) : null;

  const a11y = (name: FieldName) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${fieldIds[name]}-error` : undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOrgName = orgName.trim();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();

    const nextErrors = validateFields();
    setErrors(nextErrors);
    const firstInvalid = (["org", "first", "email", "password"] as FieldName[]).find((name) => nextErrors[name]);
    if (firstInvalid) {
      document.getElementById(fieldIds[firstInvalid])?.focus();
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

  const inputWrap = (name: string) => authInputWrap(!!errors[name as FieldName]);

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
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="register-organization" className={authLabel}>Organization name</label>
          <div className={inputWrap("org")}>
            <Building2 className={authIcon} />
            <input
              type="text"
              id="register-organization"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Technologies"
              onBlur={() => validateOne("org")}
              autoComplete="organization"
              {...a11y("org")}
              className={authInput}
              required
            />
          </div>
          {fieldError("org")}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="register-first-name" className={authLabel}>First name</label>
            <div className={inputWrap("first")}>
              <User className={authIcon} />
              <input
                value={firstName}
                id="register-first-name"
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => validateOne("first")}
                autoComplete="given-name"
                {...a11y("first")}
                className={authInput}
                required
              />
            </div>
            {fieldError("first")}
          </div>
          <div>
            <label htmlFor="register-last-name" className={authLabel}>Last name</label>
            <div className={inputWrap("last")}>
              <input
                value={lastName}
                id="register-last-name"
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                className={authInput}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="register-email" className={authLabel}>Work email</label>
          <div className={inputWrap("email")}>
            <Mail className={authIcon} />
            <input
              type="email"
              id="register-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              onBlur={() => validateOne("email")}
              autoComplete="email"
              {...a11y("email")}
              className={authInput}
              required
            />
          </div>
          {fieldError("email")}
        </div>

        <div>
          <label htmlFor="register-password" className={authLabel}>Password</label>
          <div className={inputWrap("password")}>
            <Lock className={authIcon} />
            <input
              type={showPassword ? "text" : "password"}
              id="register-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => { if (password) validateOne("password"); }}
              autoComplete="new-password"
              {...a11y("password")}
              className={authInput}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldError("password")}
          <div className="mt-3" aria-label="Password strength">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => {
                const met = passwordRules(password).filter((rule) => rule.met).length;
                const tone = met === 3 ? "bg-emerald-500" : met === 2 ? "bg-amber-400" : "bg-rose-400";
                return <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${password && i < met ? tone : "bg-slate-200"}`} />;
              })}
            </div>
            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1" aria-label="Password requirements">
              {passwordRules(password).map((rule) => (
                <li key={rule.label} className={`flex items-center gap-1.5 text-[12px] transition-colors ${rule.met ? "font-semibold text-emerald-600" : "text-slate-500"}`}>
                  <Check aria-hidden="true" className={`h-3 w-3 ${rule.met ? "opacity-100" : "opacity-30"}`} />
                  {rule.label}
                  <span className="sr-only">{rule.met ? " (met)" : " (not met)"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <label htmlFor="register-plan" className={authLabel}>Preferred plan</label>
          <div className={inputWrap("plan")}>
            <select
              value={subscriptionPlan}
              id="register-plan"
              onChange={(e) => setSubscriptionPlan(e.target.value as SubscriptionPlan)}
              className={`${authInput} cursor-pointer appearance-none`}
            >
              {plans.length === 0 && <option value="FREE_TRIAL">Free trial</option>}
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {plan.maxEmployees.toLocaleString("en-IN")} employees, {plan.maxBranches.toLocaleString("en-IN")} {plan.maxBranches === 1 ? "branch" : "branches"}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
          {subscriptionPlan !== "FREE_TRIAL" && (
            <p className="mt-1.5 text-xs text-slate-500">
              You will start on the trial, then we will open checkout for {subscriptionPlan.toLowerCase()}.
            </p>
          )}
        </div>

        <button type="submit" disabled={submitting} className={authPrimaryButton}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Create workspace
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-500">14-day trial · up to 10 employees · upgrade any time</p>
      </form>
    </AuthShell>
  );
}
