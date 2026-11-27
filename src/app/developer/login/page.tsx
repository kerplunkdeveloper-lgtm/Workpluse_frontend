"use client";
import { FormEvent, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AuthShell, { authInput, authInputWrap, authLabel, authPrimaryButton } from "@/components/ui/AuthShell";
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
export default function DeveloperLoginPage() {
  const { login } = useAuth(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); await login(email, password, "DEVELOPER"); setBusy(false); };
  return <AuthShell eyebrow="Support operations" title="Developer sign in" description="Access the customer support queue assigned by the platform team." asideTitle="Keep every customer issue moving." asideDescription="Reply, triage, and resolve support requests from one focused developer workspace." points={["Cross-workspace support queue", "Internal notes and status controls", "Clear customer conversation history"]}><form onSubmit={submit} className="space-y-5"><div><label className={authLabel}>Developer email</label><div className={authInputWrap()}><Mail className="h-4 w-4 text-slate-400" /><input className={authInput} value={email} onChange={e => setEmail(e.target.value)} type="email" required autoComplete="username" /></div></div><div><label className={authLabel}>Password</label><div className={authInputWrap()}><Lock className="h-4 w-4 text-slate-400" /><input className={authInput} value={password} onChange={e => setPassword(e.target.value)} type="password" required autoComplete="current-password" /></div></div><button className={authPrimaryButton} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}</button></form></AuthShell>;
}
