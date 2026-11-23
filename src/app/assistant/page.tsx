"use client";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
export default function AssistantPage() { return <ProtectedRoute><AppLayout><div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h1 className="text-2xl font-bold text-slate-900">Clocked AI Assistant</h1><p className="mt-2 text-sm text-slate-600">Ask about attendance, leave, payroll, policies, and how to use Clocked.</p><p className="mt-4 text-sm text-indigo-700">Use the assistant button in the bottom-right to start a conversation.</p></div></AppLayout></ProtectedRoute>; }
