"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi, billingApi, orgApi, employeesApi } from "@/lib/api";
import {
  Settings,
  Check,
  Loader2,
  FileText,
  Save,
  Building,
  Shield,
  Download,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import PhoneInput, { getCountryCodeFromPhone, sanitizePhone, toE164, validatePhone, type CountryCode } from "@/components/ui/PhoneInput";
import { unwrapList } from "@/lib/utils";
import { trialDaysLabel, trialDaysRemaining } from "@/components/billing/WorkspaceBilling";
import type { SubscriptionPlanOption } from "@/types";
import WebhooksSettings from "@/components/settings/WebhooksSettings";
import AdminTwoFactorPolicy from "@/components/settings/AdminTwoFactorPolicy";
import { confirmDialog } from "@/components/ui/confirmDialog";
import CompanyLogoSetting from "@/components/settings/CompanyLogoSetting";
import Select from "@/components/ui/Select";

const COMMON_TIMEZONES: [string, string][] = [
  ["Asia/Kolkata", "India (IST, UTC+5:30)"],
  ["Asia/Dubai", "UAE (GST, UTC+4)"],
  ["Asia/Singapore", "Singapore (UTC+8)"],
  ["Europe/London", "UK (GMT/BST)"],
  ["America/New_York", "US Eastern"],
  ["America/Chicago", "US Central"],
  ["America/Los_Angeles", "US Pacific"],
  ["Australia/Sydney", "Sydney"],
  ["UTC", "UTC"],
];

export default function SubscriptionSettingsView() {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlanOption[]>([]);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [couponCode, setCouponCode] = useState("");
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [offerQuotes, setOfferQuotes] = useState<{ plan: string; ok: boolean; text: string }[] | null>(null);
  const [checkingOffer, setCheckingOffer] = useState(false);

  // Shows what the typed offer code does on each paid plan before anyone pays.
  const checkOffer = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCheckingOffer(true);
    try {
      const results = await Promise.all(
        ["STARTER", "PROFESSIONAL", "ENTERPRISE"].map(async (plan) => {
          const name = plans.find((p: any) => p.id === plan)?.name || plan;
          try {
            const res = await billingApi.quote({ plan, billingCycle, couponCode: code });
            const d = res?.data;
            const text = d?.free
              ? `${name}: free (you save ₹${Number(d.discountAmountInr).toLocaleString("en-IN")})`
              : `${name}: pay ₹${Number(d?.amountInr).toLocaleString("en-IN")} (save ₹${Number(d?.discountAmountInr).toLocaleString("en-IN")})`;
            return { plan, ok: true, text };
          } catch (err: any) {
            return { plan, ok: false, text: `${name}: ${err?.response?.data?.message?.replace(/Offer \S+ /, "Offer ") || "not available"}` };
          }
        }),
      );
      setOfferQuotes(results);
    } finally {
      setCheckingOffer(false);
    }
  };
  const [orgForm, setOrgForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    timezone: "UTC",
  });
  const [orgPhoneCountryCode, setOrgPhoneCountryCode] = useState<CountryCode>("+91");
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeEmployeesCount, setActiveEmployeesCount] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [ssoForm, setSsoForm] = useState({ enabled: false, issuer: "", clientId: "", clientSecret: "", emailDomain: "" });
  const [ssoCallbackUrl, setSsoCallbackUrl] = useState("");
  const [isSavingSso, setIsSavingSso] = useState(false);

  useEffect(() => {
    if (user?.organization) {
      setOrgForm({
        name: user.organization.name || "",
        email: user.organization.email || user.email || "",
        phone: sanitizePhone(user.organization.phone || "", getCountryCodeFromPhone(user.organization.phone || "")),
        address: user.organization.address || "",
        taxId: user.organization.taxId || "",
        timezone: user.organization.timezone || "UTC",
      });
      setOrgPhoneCountryCode(getCountryCodeFromPhone(user.organization.phone || ""));
    }
  }, [user]);

  useEffect(() => {
    orgApi.get().then((res) => {
      const sso = res?.data?.sso;
      if (sso) {
        setSsoCallbackUrl(sso.callbackUrl || "");
        setSsoForm((current) => ({ ...current, enabled: Boolean(sso.enabled), issuer: sso.issuer || "", clientId: sso.clientId || "", emailDomain: sso.emailDomain || "" }));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await authApi.getPlans();
        if (res?.success && Array.isArray(res.plans) && res.plans.length > 0) {
          setPlans(res.plans);
        }
      } catch (err) {
        console.error("Failed to load plans from backend:", err);
        toast.error("Subscription plans are temporarily unavailable.");
      }
    }
    loadPlans();
    billingApi.orders().then((res) => setOrders(unwrapList(res).length ? unwrapList(res) : res?.data || [])).catch(() => {});
    employeesApi
      .list({ page: 1, limit: 1, status: "ACTIVE" })
      .then((res) => setActiveEmployeesCount(res?.total ?? unwrapList(res).length))
      .catch(() => {});
  }, []);

  const handleUpgrade = async (planId: string) => {
    if (planId === "FREE_TRIAL") return;
    setUpgradingPlan(planId);
    try {
      const idempotencyKey = typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const checkout = await billingApi.checkout({ plan: planId, billingCycle, couponCode: couponCode.trim() || undefined, idempotencyKey });
      // A 100%-off offer leaves nothing to pay: the server has already activated
      // the plan, so there is no Razorpay window to open.
      if (checkout?.success && checkout.data?.activated) {
        const planName = plans.find((plan: any) => plan.id === planId)?.name || planId;
        toast.success(`Offer applied. Your ${planName} plan is now active.`);
        setCouponCode("");
        await refreshUser();
        billingApi.orders().then((res) => setOrders(unwrapList(res).length ? unwrapList(res) : res?.data || [])).catch(() => {});
        return;
      }
      if (checkout?.success && (checkout.data?.razorpayOrderId || checkout.data?.razorpaySubscriptionId)) {
        if (Number(checkout.data.discountAmountInr || 0) > 0) {
          toast.success(`Offer applied. You save ₹${Number(checkout.data.discountAmountInr).toLocaleString("en-IN")}.`);
        }
        const options: any = {
          key: checkout.data.keyId,
          currency: "INR",
          name: "WorkPluse",
          description: `${checkout.data.plan} ${checkout.data.billingCycle === "ANNUAL" ? "annual" : "monthly"} subscription`,
          prefill: {
            name: user?.organization?.name || user?.email || "",
            email: user?.organization?.email || user?.email || "",
            contact: String(user?.organization?.phone || "").replace(/\D/g, "").slice(-10),
          },
          notes: {
            organizationId: user?.organizationId || "",
            plan: checkout.data.plan,
            billingCycle: checkout.data.billingCycle,
            couponCode: couponCode.trim().toUpperCase(),
          },
          handler: async (response: any) => {
            const verify = await billingApi.verify(response);
            if (verify?.success) {
              toast.success("Payment received. Plan activated.");
              await refreshUser();
            } else toast.error(verify?.message || "Verify failed");
          },
        };
        if (checkout.data.razorpaySubscriptionId) options.subscription_id = checkout.data.razorpaySubscriptionId;
        else { options.amount = Math.round(Number(checkout.data.amountInr) * 100); options.order_id = checkout.data.razorpayOrderId; }
        const existing = document.getElementById("razorpay-checkout");
        if (!existing) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.id = "razorpay-checkout";
            s.src = "https://checkout.razorpay.com/v1/checkout.js";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Could not load Razorpay"));
            document.body.appendChild(s);
          });
        }
        // @ts-expect-error Razorpay global
        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }
      toast.error(checkout?.message || "Checkout could not be started. Payment is required to activate a paid plan.");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to upgrade";
      if (String(msg).includes("Razorpay is not configured")) {
        toast.error("Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or use an unlock code.");
      } else toast.error(msg);
    } finally {
      setUpgradingPlan(null);
    }
  };

  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("checkout");
    if (plan && plan !== "FREE_TRIAL") {
      void handleUpgrade(plan);
    }
    // Signup checkout should fire once after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    if (!(await confirmDialog({ title: "Cancel at period end?", message: "The workspace stays usable until the current billing period expires.", confirmLabel: "Cancel subscription" }))) return;
    setCancelling(true);
    try {
      const res = await billingApi.cancel();
      if (res?.success) {
        toast.success(res.data?.message || "Subscription canceled at period end.");
        await refreshUser();
      } else toast.error(res?.message || "Could not cancel");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOrg(true);
    try {
      const phoneError = validatePhone(orgForm.phone, orgPhoneCountryCode, false);
      if (phoneError) {
        toast.error(phoneError);
        return;
      }
      const res = await orgApi.update({ ...orgForm, phone: toE164(orgPhoneCountryCode, orgForm.phone) });
      if (res?.success) {
        toast.success("Organization profile saved successfully!");
        await refreshUser();
      } else toast.error(res?.message || "Save failed");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save organization profile");
    } finally {
      setIsSavingOrg(false);
    }
  };

  const currentPlan = user?.organization?.subscriptionPlan || "FREE_TRIAL";
  const maxEmployees = user?.features?.maxEmployees || user?.organization?.maxEmployees || 10;
  const usagePercentage = Math.min(Math.round((activeEmployeesCount / maxEmployees) * 100), 100);
  const entitlement = user?.entitlement;
  const statusLabel = entitlement?.allowApp === false
    ? "Inactive"
    : entitlement?.state === "TRIAL" || entitlement?.state === "TRIALING"
      ? "Trial"
      : entitlement?.state === "CANCELED_ACTIVE"
        ? "Canceled"
        : entitlement?.state === "PAST_DUE"
          ? "Payment due"
        : entitlement?.state === "GRACE"
          ? "Grace period"
          : "Active";

  const invoices = orders.map((o) => {
    const amount = Number(o.amountInr || 0);
    const discount = Number(o.discountAmountInr || 0);
    return {
      orderId: o.id as string,
      id: o.razorpayOrderId || o.id,
      number: `INV-${String(o.id).slice(0, 8).toUpperCase()}`,
      date: o.paidAt || o.createdAt,
      amount: amount === 0 && o.status === "PAID" ? "Free" : `₹${amount.toLocaleString("en-IN")}`,
      saved: discount > 0 ? `₹${discount.toLocaleString("en-IN")} saved` : "",
      status: String(o.status || ""),
      plan: String(o.plan || ""),
      cycle: String(o.billingCycle || "").toLowerCase(),
    };
  });
  const planLabel = (plan: string) => plan.charAt(0) + plan.slice(1).toLowerCase().replace("_", " ");
  const formatReceiptDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const statusBadge = (status: string) =>
    status === "PAID"
      ? { label: "Paid", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" }
      : status === "FAILED"
        ? { label: "Failed", cls: "bg-rose-50 text-rose-700 ring-rose-600/20" }
        : { label: "Pending", cls: "bg-amber-50 text-amber-700 ring-amber-600/20" };

  const downloadInvoice = async (orderId: string, invoiceId: string) => {
    try {
      const response = await billingApi.downloadInvoice(orderId);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${invoiceId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Invoice could not be downloaded.");
    }
  };

  const handleSsoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSso(true);
    try {
      const res = await orgApi.updateSso(ssoForm);
      if (res?.success) toast.success(ssoForm.enabled ? "Company SSO enabled." : "Company SSO disabled.");
      else toast.error(res?.message || "Could not save SSO settings.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not save SSO settings.");
    } finally {
      setIsSavingSso(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-indigo-600" />
          Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your SaaS license tier, employee quota, enterprise security features, and company profile.
        </p>
      </div>

      <div className="space-y-6">
        <div className="min-w-0 space-y-8">
      {/* Current Active Plan Overview Card */}
      <div id="overview" className="scroll-mt-24 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-50 to-sky-50 rounded-bl-full opacity-60 pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-6 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                {currentPlan.replace(/_/g, " ")}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
                entitlement?.allowApp === false
                  ? "text-rose-700 bg-rose-50 border-rose-200"
                  : statusLabel === "Trial" || statusLabel === "Grace period" || statusLabel === "Canceled"
                    ? "text-amber-800 bg-amber-50 border-amber-200"
                    : "text-emerald-700 bg-emerald-50 border-emerald-200"
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                {statusLabel}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              {user?.organization?.name || "WorkPluse Global Technologies"}
            </h2>
            <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
              {entitlement?.message ||
                (statusLabel === "Trial"
                  ? `${trialDaysLabel(trialDaysRemaining(entitlement, user?.organization))}. Paid plans unlock after checkout.`
                  : "GPS attendance, payroll, and people operations for this workspace.")}
            </p>
            {["STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(currentPlan) && statusLabel !== "Canceled" && entitlement?.allowApp !== false && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50"
              >
                {cancelling ? "Canceling…" : "Cancel subscription at period end"}
              </button>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs min-w-[260px]">
            <div className="flex justify-between font-medium">
              <span className="text-slate-500">Employee Capacity:</span>
              <span className="font-bold text-slate-900">{activeEmployeesCount} / {maxEmployees}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{activeEmployeesCount} Active Employees</span>
              <span>{Math.max(0, maxEmployees - activeEmployeesCount)} Seats Free</span>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Profile */}
      <div id="company" className="scroll-mt-24 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Company & Organization Profile</h3>
            <p className="text-xs text-slate-500">Update your official company name, billing contact email, and address</p>
          </div>
        </div>

        <CompanyLogoSetting />

        <form onSubmit={handleOrgSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-slate-700">Organization Name</label>
              <input
                type="text"
                required
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
                placeholder="WorkPluse Global Technologies"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-slate-700">Billing Email Address</label>
              <input
                type="email"
                value={orgForm.email}
                onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
                placeholder="billing@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-slate-700">Phone Number</label>
              <PhoneInput value={orgForm.phone} onChange={(digits) => setOrgForm({ ...orgForm, phone: digits })} countryCode={orgPhoneCountryCode} onCountryCodeChange={setOrgPhoneCountryCode} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-slate-700">Tax ID / VAT Number</label>
              <input
                type="text"
                value={orgForm.taxId}
                onChange={(e) => setOrgForm({ ...orgForm, taxId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
                placeholder="US-123456789"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[13px] font-medium text-slate-700">Official Office Address</label>
              <input
                type="text"
                value={orgForm.address}
                onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
                placeholder="100 Innovation Drive, Suite 400, San Francisco, CA 94103"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingOrg}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xs flex items-center gap-2 transition disabled:opacity-60"
            >
              {isSavingOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSavingOrg ? "Saving..." : "Save Organization Profile"}
            </button>
          </div>
        </form>
      </div>

      {/* Timezone & region */}
      <div id="timezone" className="scroll-mt-24 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Timezone & region</h3>
            <p className="text-xs text-slate-500">Sets the clock your attendance, late marks and dashboard charts run on</p>
          </div>
        </div>
        <form onSubmit={handleOrgSubmit} className="space-y-4">
          <div className="space-y-1.5 max-w-md">
            <label htmlFor="org-timezone" className="text-[13px] font-medium text-slate-700">Company timezone</label>
            <Select
              id="org-timezone"
              value={orgForm.timezone}
              onChange={(e) => setOrgForm({ ...orgForm, timezone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
            >
              {COMMON_TIMEZONES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
              {!COMMON_TIMEZONES.some(([value]) => value === orgForm.timezone) && (
                <option value={orgForm.timezone}>{orgForm.timezone}</option>
              )}
            </Select>
            <p className="text-[11px] text-slate-500">
              Attendance days, punch-in times, late marks and the dashboard punch-in chart all use this timezone. Changes can take a few minutes to apply. Past attendance keeps the date it was recorded with.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingOrg}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xs flex items-center gap-2 transition disabled:opacity-60"
            >
              {isSavingOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSavingOrg ? "Saving..." : "Save timezone"}
            </button>
          </div>
        </form>
      </div>

      {user?.role === "COMPANY_ADMIN" || user?.role === "SUPER_ADMIN" ? (
        <div id="sso" className="scroll-mt-24 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-2xl bg-violet-50 text-violet-600"><Shield className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Enterprise single sign-on</h3>
              <p className="text-xs text-slate-500">Connect any OpenID Connect provider. Client secrets are encrypted on the server.</p>
            </div>
          </div>
          <form onSubmit={handleSsoSubmit} className="space-y-4">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={ssoForm.enabled} onChange={(e) => setSsoForm({ ...ssoForm, enabled: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              Enable company SSO for this workspace
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={ssoForm.issuer} onChange={(e) => setSsoForm({ ...ssoForm, issuer: e.target.value })} placeholder="Issuer URL (https://idp.example.com)" className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900" />
              <input value={ssoForm.clientId} onChange={(e) => setSsoForm({ ...ssoForm, clientId: e.target.value })} placeholder="OIDC client ID" className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900" />
              <input type="password" value={ssoForm.clientSecret} onChange={(e) => setSsoForm({ ...ssoForm, clientSecret: e.target.value })} placeholder="OIDC client secret (leave blank to keep)" className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900" autoComplete="new-password" />
              <input value={ssoForm.emailDomain} onChange={(e) => setSsoForm({ ...ssoForm, emailDomain: e.target.value })} placeholder="Allowed email domain (company.com)" className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900" />
            </div>
            {/* <p className="text-[11px] text-slate-500">Register this callback URL with your identity provider: <code className="rounded bg-slate-100 px-1.5 py-0.5">{ssoCallbackUrl || "Configure BACKEND_PUBLIC_URL on the API"}</code></p> */}
            <div className="flex justify-end"><button type="submit" disabled={isSavingSso} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">{isSavingSso ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}Save SSO Settings</button></div>
          </form>
        </div>
      ) : null}

      {/* Billing Cycle Switcher */}
      <div id="plans" className="scroll-mt-24 flex flex-col items-center text-center space-y-3 pt-4">
        <h3 className="text-base font-semibold text-slate-900">Choose Your Subscription Tier</h3>
        <p className="text-xs text-slate-500 max-w-md">
          Scale effortlessly as your workforce grows. Save 20% with annual billing.
        </p>

        <div className="flex items-center gap-2 p-1 rounded-xl bg-white border border-slate-200 shadow-xs text-xs font-semibold">
          <button
            onClick={() => setBillingCycle("MONTHLY")}
            className={`px-4 py-1.5 rounded-lg transition ${
              billingCycle === "MONTHLY" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle("ANNUAL")}
            className={`px-4 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              billingCycle === "ANNUAL" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Annual Billing</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={couponCode}
            onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setOfferQuotes(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") void checkOffer(); }}
            placeholder="Offer code (optional)"
            maxLength={40}
            className="w-52 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            aria-label="Offer code"
          />
          <button
            type="button"
            onClick={() => void checkOffer()}
            disabled={!couponCode.trim() || checkingOffer}
            className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold disabled:opacity-40"
          >
            {checkingOffer ? "Checking…" : "Apply"}
          </button>
          <span className="text-xs text-slate-500">Try WELCOME20 or ANNUAL20</span>
        </div>
        {offerQuotes && (
          <ul className="basis-full space-y-1 text-xs" aria-live="polite">
            {offerQuotes.map((q) => (
              <li key={q.plan} className={q.ok ? "text-emerald-700" : "text-slate-400"}>{q.ok ? "✓ " : "✗ "}{q.text}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {plans.length === 0 && (
          <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Subscription plans are currently unavailable. Please try again later.
          </div>
        )}
        {plans.map((p) => {
          const isSelected = currentPlan === p.id;
          const price = billingCycle === "MONTHLY" ? p.priceMonthly : p.priceAnnual;
          return (
            <div
              key={p.id}
              className={`bg-white rounded-3xl p-6 border flex flex-col justify-between transition-all duration-200 relative shadow-xs hover:shadow-md ${
                p.popular
                  ? "border-indigo-500 shadow-md ring-1 ring-indigo-500/30"
                  : isSelected
                  ? "border-emerald-500 ring-1 ring-emerald-500/30"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider shadow">
                  Most Popular
                </div>
              )}
              {isSelected && (
                <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider shadow">
                  Active
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    {p.badge}
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 mt-0.5">{p.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 min-h-[40px] leading-relaxed">{p.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">₹{Number(price || 0).toLocaleString("en-IN")}</span>
                  <span className="text-xs text-slate-500">{billingCycle === "ANNUAL" ? "/ year" : "/ month"}</span>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-600">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-xs leading-relaxed">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <button
                  disabled={isSelected || upgradingPlan !== null}
                  onClick={() => handleUpgrade(p.id)}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default font-semibold"
                      : p.popular
                      ? "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-xs font-semibold disabled:opacity-50"
                      : "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-semibold disabled:opacity-50"
                  }`}
                >
                  {upgradingPlan === p.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSelected
                    ? "✓ Current Active Plan"
                    : upgradingPlan === p.id
                    ? "Upgrading..."
                    : `Upgrade to ${p.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Billing History Section */}
      <div id="billing" className="scroll-mt-24 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Billing History & Invoices</h3>
            <p className="text-xs text-slate-500">Download past invoices and review payment receipts</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
            <FileText className="mx-auto h-6 w-6 text-slate-300" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-slate-600">No invoices yet</p>
            <p className="text-xs text-slate-400">Receipts appear here after your first paid or activated plan.</p>
          </div>
        ) : (
          <>
            {/* Tablet and desktop: aligned table */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full table-fixed text-left text-[13px]">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="w-[22%] px-4 py-3">Invoice</th>
                    <th className="w-[15%] px-4 py-3">Date</th>
                    <th className="w-[20%] px-4 py-3">Plan</th>
                    <th className="w-[15%] px-4 py-3 text-right">Amount</th>
                    <th className="w-[12%] px-4 py-3">Status</th>
                    <th className="w-[16%] px-4 py-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {invoices.map((inv) => {
                    const badge = statusBadge(inv.status);
                    return (
                      <tr key={inv.orderId} className="transition hover:bg-slate-50/60">
                        <td className="px-4 py-3.5 align-middle font-semibold text-slate-900 truncate">{inv.number}</td>
                        <td className="px-4 py-3.5 align-middle text-slate-500 whitespace-nowrap">{formatReceiptDate(inv.date)}</td>
                        <td className="px-4 py-3.5 align-middle">
                          <span className="font-medium text-slate-800">{planLabel(inv.plan)}</span>
                          {inv.cycle && <span className="ml-1.5 text-xs capitalize text-slate-400">{inv.cycle}</span>}
                        </td>
                        <td className="px-4 py-3.5 align-middle text-right tabular-nums">
                          <span className="font-semibold text-slate-900">{inv.amount}</span>
                          {inv.saved && <span className="block text-[11px] font-normal text-emerald-600">{inv.saved}</span>}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td className="px-4 py-3.5 align-middle text-right">
                          {inv.status === "PAID" ? (
                            <button
                    type="button"
                    onClick={() => void downloadInvoice(inv.orderId, inv.number)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Download PDF
                  </button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phones: one card per invoice, nothing scrolls sideways */}
            <ul className="space-y-3 md:hidden">
              {invoices.map((inv) => {
                const badge = statusBadge(inv.status);
                return (
                  <li key={inv.orderId} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{inv.number}</p>
                        <p className="text-xs text-slate-500">{formatReceiptDate(inv.date)}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {planLabel(inv.plan)}
                          {inv.cycle && <span className="ml-1.5 text-xs capitalize text-slate-400">{inv.cycle}</span>}
                        </p>
                        <p className="text-base font-bold tabular-nums text-slate-900">{inv.amount}</p>
                        {inv.saved && <p className="text-[11px] text-emerald-600">{inv.saved}</p>}
                      </div>
                      {inv.status === "PAID" && (
                        <button
                    type="button"
                    onClick={() => void downloadInvoice(inv.orderId, inv.number)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 active:bg-indigo-100"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Download PDF
                  </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {user?.role === "COMPANY_ADMIN" && <div id="security" className="scroll-mt-24"><AdminTwoFactorPolicy /></div>}
      {user?.features?.hasApiAccess && <div id="webhooks" className="scroll-mt-24"><WebhooksSettings /></div>}
      </div>
      </div>
    </div>
  );
}
