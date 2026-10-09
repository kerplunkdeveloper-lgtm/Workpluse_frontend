import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  Factory,
  HardHat,
  HeartPulse,
  Hotel,
  KeyRound,
  Lock,
  MapPin,
  ReceiptIndianRupee,
  Smartphone,
  Store,
  Truck,
  UserPlus,
  WifiOff,
  Wrench,
} from "lucide-react";

/** All marketing copy lives here so sections stay presentational and easy to change. */
export const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#offline", label: "Offline" },
  { href: "#pricing", label: "Pricing" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
] as const;

export const HERO = {
  eyebrow: "Attendance, leave and payroll for Indian teams",
  headline: ["Run the workday", "without losing the people."],
  subhead:
    "Stop buddy punching with GPS boundary checks. Keep teams clocking in even without internet. Automate salary breakdowns, statutory deductions and invitations.",
  primaryCta: { label: "Start free, 14 days", href: "/register" },
  secondaryCta: { label: "Sign in to your workspace", href: "/login" },
  trustPoints: ["GPS geofencing", "Works offline", "PF, ESI and TDS ready", "Up to 10,000 people"],
} as const;

export const INDUSTRIES: { icon: LucideIcon; label: string }[] = [
  { icon: Factory, label: "Manufacturing" },
  { icon: Store, label: "Retail chains" },
  { icon: Truck, label: "Logistics" },
  { icon: HeartPulse, label: "Healthcare" },
  { icon: HardHat, label: "Construction" },
  { icon: Wrench, label: "Field services" },
  { icon: Hotel, label: "Hospitality" },
];

export type FeatureId = "geofence" | "offline" | "payroll" | "shifts" | "invite" | "unlock";
export type Feature = { id: FeatureId; icon: LucideIcon; title: string; body: string };

export const FEATURES: Feature[] = [
  { id: "geofence", icon: MapPin, title: "GPS geofencing", body: "Punches are accepted only inside the office radius you set for each branch. Bypass attempts are audited." },
  { id: "offline", icon: WifiOff, title: "Offline-first punches", body: "Punches save on the device with exact timestamps and sync the moment the connection returns, with no duplicates." },
  { id: "payroll", icon: ReceiptIndianRupee, title: "Statutory payroll", body: "Overtime, comp-off, loss-of-pay, PF and ESI calculated and payslips generated in one click." },
  { id: "shifts", icon: CalendarRange, title: "Shifts and rosters", body: "Grace periods, rotating rosters, shift swaps and per-day overrides. Rest-day work earns overtime automatically." },
  { id: "invite", icon: UserPlus, title: "Invite in one step", body: "Employees get a secure link and a temporary password, and set their own password on first sign-in." },
  { id: "unlock", icon: KeyRound, title: "Unlock by code", body: "Each new workspace is activated with a one-time unlock code sent by email, so only your admins get in." },
];

export const OFFLINE = {
  eyebrow: "Built for weak networks",
  headline: "Punch in from a basement. Sync when the signal returns.",
  body: "Factory floors, warehouses and remote sites lose signal. WorkPulse records each punch on the device and sends them to the server in order, keeping the exact time each one happened.",
  points: [
    "Punches are kept safe if the tab closes or the device restarts",
    "The exact original time is honoured, so nobody gets an unfair late mark",
    "Duplicate punches are removed automatically",
  ],
} as const;

export const SECURITY = [
  { icon: Lock, title: "Built for trust", body: "Hashed passwords, short-lived sessions, optional two-step sign-in, role checks and audit records. Each company's data stays separate." },
  { icon: Smartphone, title: "Web and mobile", body: "Admins and HR manage from the web. Employees punch from any phone browser, or from the companion app." },
  { icon: ReceiptIndianRupee, title: "Indian payroll workflows", body: "PF, ESI, tax, overtime and statutory exports. Your team stays responsible for checking the rules that apply to you." },
];

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#features", label: "Features" },
      { href: "#offline", label: "Offline punches" },
      { href: "#pricing", label: "Pricing" },
      { href: "#security", label: "Security" },
    ],
  },
  {
    title: "Get started",
    links: [
      { href: "/register", label: "Start free trial" },
      { href: "/login", label: "Sign in" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

export const WORKFLOW = [
  { number: "01", title: "Set the rules", body: "Create branches, working hours, geofences and payroll policies in one guided setup." },
  { number: "02", title: "Keep every punch", body: "Employees clock in from their phone. Offline punches remain timestamped and sync later." },
  { number: "03", title: "Close the month", body: "Review attendance, approve leave and generate payroll-ready records without spreadsheet drift." },
] as const;

export const FAQ = [
  { question: "What happens when an employee loses internet?", answer: "The punch is stored securely on the device with its original time and syncs automatically when the connection returns." },
  { question: "Can each branch have its own attendance rules?", answer: "Yes. Set a separate geofence, radius, shift pattern and grace period for every branch." },
  { question: "Does WorkPulse support Indian payroll workflows?", answer: "WorkPulse includes workflows for PF, ESI, TDS, overtime, loss of pay and payslip generation. Your team remains responsible for reviewing rules that apply to your organisation." },
  { question: "Can we start without a card?", answer: "Yes. Start with the free trial and move to a paid plan only when your workspace is ready." },
  { question: "How many employees can we add?", answer: "Plans are designed to scale from a small team to large multi-branch organisations. Current limits are shown in the live pricing section." },
  { question: "Where can employees use WorkPulse?", answer: "Admins and HR work from the web. Employees can punch from a phone browser or the companion app." },
] as const;
