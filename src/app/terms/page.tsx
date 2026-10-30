import Link from "next/link";

export const metadata = { title: "Terms of Service", description: "Terms for using the WorkPluse workforce platform." };

export default function TermsPage() {
  return <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-800 sm:px-6"><article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
    <Link href="/" className="text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline">← WorkPluse</Link>
    <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950">Terms of service</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">Last updated: 30 October 2026</p>
    <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
      <section><h2 className="text-lg font-bold text-slate-950">Service and limitations</h2><p>WorkPluse provides workforce management tools. Attendance, payroll, tax, statutory, leave, recovery-leave and shoot-settlement outputs support review and do not replace professional legal, tax, payroll or employment advice. Customers must verify calculations and approvals before relying on them.</p></section>
      <section><h2 className="text-lg font-bold text-slate-950">Authorized use</h2><p>Customers must provide accurate information, protect credentials, assign least-privilege roles, give employee notices, obtain required permissions or consent, and use the service for lawful organizational purposes. Do not upload data you are not allowed to process or attempt to bypass security or workspace boundaries.</p></section>
      <section><h2 className="text-lg font-bold text-slate-950">Subscriptions and billing</h2><p>Plan limits, prices, billing periods and included capabilities are shown during checkout. Paid access may continue until the current period ends after cancellation. Failed or overdue payments may restrict access after any displayed grace period. Taxes, invoices and refunds are handled as shown at checkout or in the applicable customer agreement.</p></section>
      <section><h2 className="text-lg font-bold text-slate-950">Customer data</h2><p>Customers retain responsibility for their data, legal basis, notices, retention instructions and employee requests. They authorize WorkPluse to process that data only to deliver, secure, maintain and support the service and as required by law.</p></section>
      <section><h2 className="text-lg font-bold text-slate-950">Content, claims and copyright</h2><p>Customers must own or have permission to upload documents, logos, images, comments and other content. Do not submit misleading claims, fake reviews, impersonation, unlawful material or content that infringes another person’s rights. WorkPluse branding, software, copy and design remain protected by applicable intellectual-property laws.</p></section>
      <section><h2 className="text-lg font-bold text-slate-950">Availability and third parties</h2><p>The service may change or experience maintenance, network failures or interruptions. Maps, payment, email, storage and other third-party services are subject to their own terms. Any specific uptime or support commitment applies only when stated in a signed customer agreement.</p></section>
      <section><h2 className="text-lg font-bold text-slate-950">Suspension and termination</h2><p>Access may be suspended for security risks, unlawful use, material breach or unpaid charges. Workspace administrators should export required records before closing an account. Data deletion and retention are handled according to the Privacy Notice, workspace instructions and applicable legal requirements.</p></section>
      <section><h2 className="text-lg font-bold text-slate-950">Local law</h2><p>Customers must assess the laws applicable to their organization, employees and locations, including India’s data-protection, employment, tax, consumer and records requirements where relevant. These terms are not a substitute for local legal advice.</p></section>
    </div>
  </article></main>;
}
