"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Fingerprint, KeyRound, Loader2, Plus, Trash2, Wifi } from "lucide-react";
import { toast } from "sonner";
import { biometricApi, employeesApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";

type Device = { id: string; name: string; location?: string | null; apiKeyPrefix: string; isActive: boolean; lastSeenAt?: string | null };
type Employee = { id: string; firstName: string; lastName?: string | null; employeeCode: string; status?: string };
type Credential = { id: string; cardUid: string; credentialType: string; label?: string | null; employee: Employee };

const errorMessage = (error: any, fallback: string) => error?.response?.data?.message || fallback;

export default function BiometricSettings() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDevice, setSavingDevice] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cardInputRef = useRef<HTMLInputElement>(null);
  const [deviceForm, setDeviceForm] = useState({ name: "", location: "" });
  const [cardForm, setCardForm] = useState({ employeeId: "", cardUid: "", credentialType: "CARD_UID", label: "" });
  const [newApiKey, setNewApiKey] = useState("");

  const load = async () => {
    try {
      const [deviceResult, credentialResult, employeeResult] = await Promise.all([
        biometricApi.list(), biometricApi.listCredentials(), employeesApi.list({ page: 1, limit: 500, status: "ACTIVE" }),
      ]);
      setDevices(deviceResult?.data || []);
      setCredentials(credentialResult?.data || []);
      setEmployees(unwrapList(employeeResult));
    } catch (error: any) {
      toast.error(errorMessage(error, "Biometric settings could not be loaded."));
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const createDevice = async () => {
    if (!deviceForm.name.trim()) return toast.error("Enter a device name.");
    setSavingDevice(true);
    try {
      const result = await biometricApi.create({ name: deviceForm.name.trim(), location: deviceForm.location.trim() || undefined });
      setDevices((current) => [result.data, ...current]);
      setNewApiKey(result.data.apiKey || "");
      setDeviceForm({ name: "", location: "" });
      toast.success("Biometric device created. Copy the API key now.");
    } catch (error: any) { toast.error(errorMessage(error, "Device could not be created.")); }
    finally { setSavingDevice(false); }
  };

  const assignCard = async () => {
    if (!cardForm.employeeId || !cardForm.cardUid.trim()) return toast.error("Select an employee and enter the card ID.");
    setSavingCard(true);
    try {
      await biometricApi.assignCard({ employeeId: cardForm.employeeId, cardUid: cardForm.cardUid.trim(), credentialType: cardForm.credentialType, label: cardForm.label.trim() || undefined });
      setCardForm({ employeeId: "", cardUid: "", credentialType: "CARD_UID", label: "" });
      await load();
      toast.success("ID card assigned.");
    } catch (error: any) { toast.error(errorMessage(error, "Card could not be assigned.")); }
    finally { setSavingCard(false); }
  };

  return (
    <section id="biometric" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
        <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600"><Fingerprint className="h-5 w-5" /></div>
        <div><h3 className="text-base font-semibold text-slate-900">Biometric & ID card attendance</h3><p className="mt-1 text-xs leading-5 text-slate-500">Connect a biometric terminal or connector, map employee cards, and receive secure punch-in/out events.</p></div>
      </div>

      {newApiKey && <div className="mt-5 flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950"><div><p className="font-bold">Copy this device API key now</p><p className="mt-1 break-all font-mono">{newApiKey}</p><p className="mt-2 text-amber-800">Use it as the <code>x-device-key</code> header when your Mission connector sends punches.</p></div><button type="button" className="rounded-lg border border-amber-300 bg-white p-2" onClick={() => { void navigator.clipboard.writeText(newApiKey); toast.success("API key copied."); }} aria-label="Copy device API key"><Copy className="h-4 w-4" /></button></div>}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2"><Wifi className="h-4 w-4 text-indigo-600" /><h4 className="text-sm font-semibold text-slate-900">Add device</h4></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2"><input value={deviceForm.name} onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })} placeholder="Device name" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input value={deviceForm.location} onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })} placeholder="Location (optional)" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>
          <button type="button" onClick={() => void createDevice()} disabled={savingDevice} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{savingDevice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add device</button>
          <div className="mt-4 space-y-2">{devices.map((device) => <div key={device.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs"><div><p className="font-semibold text-slate-800">{device.name}</p><p className="text-slate-500">{device.location || "No location"} · key {device.apiKeyPrefix} · {device.isActive ? "Active" : "Revoked"}</p></div>{device.isActive && <button type="button" onClick={async () => { try { await biometricApi.revoke(device.id); setDevices((current) => current.map((item) => item.id === device.id ? { ...item, isActive: false } : item)); toast.success("Device revoked."); } catch (error: any) { toast.error(errorMessage(error, "Device could not be revoked.")); } }} className="rounded-lg p-2 text-rose-600 hover:bg-rose-100" aria-label={`Revoke ${device.name}`}><Trash2 className="h-4 w-4" /></button>}</div>)}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-indigo-600" /><h4 className="text-sm font-semibold text-slate-900">Assign ID card</h4></div>
          <div className="mt-3 grid gap-2"><select value={cardForm.employeeId} onChange={(e) => setCardForm({ ...cardForm, employeeId: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">Select active employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName || ""} · {employee.employeeCode}</option>)}</select><select value={cardForm.credentialType} onChange={(e) => setCardForm({ ...cardForm, credentialType: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="CARD_UID">ID card / RFID UID</option><option value="NFC_UID">NFC card / tag UID</option><option value="BIOMETRIC_USER_ID">Fingerprint / face user ID</option></select><div className="flex gap-2"><input ref={cardInputRef} value={cardForm.cardUid} onFocus={() => setCapturing(true)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setCapturing(false); toast.success("Credential captured. Select the employee and save it."); } }} onChange={(e) => setCardForm({ ...cardForm, cardUid: e.target.value })} placeholder={capturing ? "Scan card now…" : "Scan or enter credential ID"} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><button type="button" onClick={() => { setCapturing(true); cardInputRef.current?.focus(); }} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700">Capture</button></div><input value={cardForm.label} onChange={(e) => setCardForm({ ...cardForm, label: e.target.value })} placeholder="Label (optional)" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">USB readers that behave like a keyboard can type the UID here and press Enter. Network devices use the WorkPluse punch API.</p>
          <button type="button" onClick={() => void assignCard()} disabled={savingCard} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{savingCard ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Save credential mapping</button>
          <div className="mt-4 space-y-2">{loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : credentials.map((credential) => <div key={credential.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs"><div><p className="font-semibold text-slate-800">{credential.employee.firstName} {credential.employee.lastName || ""} <span className="font-normal text-slate-500">({credential.employee.employeeCode})</span></p><p className="font-mono text-slate-500">{credential.credentialType} · {credential.cardUid}{credential.label ? ` · ${credential.label}` : ""}</p></div><button type="button" onClick={async () => { try { await biometricApi.removeCard(credential.id); setCredentials((current) => current.filter((item) => item.id !== credential.id)); toast.success("Credential mapping removed."); } catch (error: any) { toast.error(errorMessage(error, "Credential mapping could not be removed.")); } }} className="rounded-lg p-2 text-rose-600 hover:bg-rose-100" aria-label="Remove credential mapping"><Trash2 className="h-4 w-4" /></button></div>)}</div>
        </div>
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">Your Mission software or connector must send the captured value to <code>/api/biometric/punch</code> as <code>cardUid</code> (or <code>credentialValue</code>), with <code>credentialType</code> and <code>punchType</code> set to <code>IN</code> or <code>OUT</code>.</p>
    </section>
  );
}
