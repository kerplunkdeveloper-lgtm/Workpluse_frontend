"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Landmark, Search } from "lucide-react";

const BANKS = [
  "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "IndusInd Bank", "Yes Bank", "IDFC FIRST Bank", "Federal Bank", "RBL Bank",
  "Bank of Baroda", "Punjab National Bank", "Canara Bank", "Union Bank of India", "Bank of India", "Indian Bank", "Central Bank of India", "Indian Overseas Bank", "UCO Bank", "Bank of Maharashtra", "Punjab & Sind Bank",
  "AU Small Finance Bank", "Equitas Small Finance Bank", "ESAF Small Finance Bank", "Ujjivan Small Finance Bank", "Jana Small Finance Bank", "Suryoday Small Finance Bank", "Airtel Payments Bank", "India Post Payments Bank", "Jio Payments Bank", "Paytm Payments Bank",
  "IDBI Bank", "Bandhan Bank", "Dhanlaxmi Bank", "South Indian Bank", "Tamilnad Mercantile Bank", "Karnataka Bank", "City Union Bank", "Karur Vysya Bank", "DCB Bank", "CSB Bank", "Jammu & Kashmir Bank", "Nainital Bank",
  "HSBC India", "Standard Chartered Bank", "Citibank India", "Deutsche Bank", "DBS Bank India", "Bank of America", "Barclays Bank India", "J.P. Morgan India", "Other / not listed",
];

export default function BankSelector({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const filtered = useMemo(() => { const term = query.trim().toLowerCase(); return term ? BANKS.filter((bank) => bank.toLowerCase().includes(term)) : BANKS; }, [query]);
  return <div ref={rootRef} className="relative">
    <input type="hidden" name="bankName" value={value} />
    <button type="button" onClick={() => setOpen((current) => !current)} className={`mt-1 flex min-h-[2.65rem] w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 text-left transition ${open ? "border-indigo-400 ring-4 ring-indigo-500/10" : "border-slate-200 hover:border-slate-300"}`} aria-haspopup="listbox" aria-expanded={open}>
      <span className={`flex min-w-0 items-center gap-2 truncate text-sm ${value ? "text-slate-900" : "text-slate-400"}`}><Landmark className="h-4 w-4 shrink-0 text-indigo-500" />{value || "Search and select your bank"}</span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 text-slate-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bank name..." className="h-10 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" aria-label="Search bank names" /></div>
      <div className="mt-2 max-h-56 overflow-y-auto" role="listbox" aria-label="Bank names">{filtered.length ? filtered.map((bank) => <button key={bank} type="button" role="option" aria-selected={value === bank} onClick={() => { setValue(bank); setOpen(false); setQuery(""); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"><span className="truncate">{bank}</span>{value === bank && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}</button>) : <p className="px-3 py-6 text-center text-xs text-slate-500">No bank found. Try a different search.</p>}</div>
    </div>}
  </div>;
}
