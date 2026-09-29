import Link from "next/link";

export const metadata = {
  title: "Privacy",
  description: "How WorkPulse handles workforce and account information.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-800 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">← WorkPulse</Link>
        <h1 className="mt-6 font-serif text-4xl font-semibold text-slate-950">Privacy notice</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Last updated: 29 September 2026</p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
          <section><h2 className="text-lg font-bold text-slate-950">Information processed</h2><p>WorkPulse processes account, employment, attendance, leave, payroll, device, location, billing, and uploaded document information supplied by a workspace and its authorized users.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Purpose</h2><p>Information is used to provide workforce workflows, authenticate users, enforce workspace permissions, produce requested records, prevent abuse, and operate subscriptions.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Workspace responsibility</h2><p>The organization operating a WorkPulse workspace controls its employee records and is responsible for lawful collection, notices, retention periods, and user access.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Service providers</h2><p>WorkPulse may use hosting, database, file-storage, email, messaging, analytics, and payment providers strictly to operate the service. Payment card details are handled by the payment provider rather than stored by WorkPulse.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Your choices</h2><p>Contact your workspace administrator to correct, export, restrict, or delete employment information. Workspace administrators may contact WorkPulse through their established support channel for account-level requests.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Security and retention</h2><p>WorkPulse applies access controls, audit records, encrypted transport, and credential protections. Records are retained only while needed for service operation, contractual requirements, or applicable legal obligations.</p></section>
        </div>
      </article>
    </main>
  );
}
