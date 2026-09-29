import Link from "next/link";

export const metadata = {
  title: "Terms",
  description: "Terms for using the WorkPulse workforce platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-800 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">← WorkPulse</Link>
        <h1 className="mt-6 font-serif text-4xl font-semibold text-slate-950">Terms of service</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Last updated: 29 September 2026</p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
          <section><h2 className="text-lg font-bold text-slate-950">Service</h2><p>WorkPulse provides tools for workforce operations. Features that calculate payroll, tax, attendance, or statutory records support administrative review and do not replace professional legal, tax, or payroll advice.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Authorized use</h2><p>Customers must maintain accurate account details, protect credentials, assign appropriate roles, obtain required employee notices or consent, and use the service only for lawful organizational purposes.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Subscriptions</h2><p>Plan limits, prices, billing periods, and included capabilities are shown during checkout. Paid access may continue until the current period ends after cancellation. Failed or overdue payments may restrict access after any displayed grace period.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Customer data</h2><p>Customers retain responsibility for their data. They grant WorkPulse permission to process it only as required to deliver, secure, maintain, and support the service.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Availability</h2><p>The service may change or experience maintenance and interruptions. Any specific uptime or support commitment applies only when stated in a signed customer agreement.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Termination</h2><p>Access may be suspended for security risks, unlawful use, material breach, or unpaid charges. Workspace administrators should export required records before closing an account.</p></section>
        </div>
      </article>
    </main>
  );
}
