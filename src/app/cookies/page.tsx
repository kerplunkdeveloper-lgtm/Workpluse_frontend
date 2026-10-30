import Link from "next/link";

export const metadata = {
  title: "Cookie Notice",
  description: "How WorkPluse uses cookies and browser storage.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-800 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline">← WorkPluse</Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950">Cookie notice</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Last updated: 30 October 2026</p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
          <section><h2 className="text-lg font-bold text-slate-950">What we use</h2><p>Necessary cookies and browser storage keep you signed in, protect sessions, remember appearance preferences and help prevent abuse. They are required for the workspace to function.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Optional analytics</h2><p>Optional analytics cookies are not enabled by default. If WorkPluse adds an analytics provider, it will load only after you allow analytics and the provider will be identified in this notice or the consent settings.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Third-party content</h2><p>Maps, payment checkout, email links or other embedded services may set their own cookies when you choose or use them. Those services have their own privacy notices and are not controlled by WorkPluse. Blocking optional cookies may limit some convenience features but will not disable necessary sign-in.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">Change your choice</h2><p>Use the cookie banner when it appears again, or clear WorkPluse site storage in your browser settings. Your organization may also configure additional integrations for its workspace.</p></section>
        </div>
      </article>
    </main>
  );
}
