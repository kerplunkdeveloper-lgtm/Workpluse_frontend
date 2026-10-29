"use client";








/* ── Types ──────────────────────────────────────────────────────────────── */

export interface Person {
  id: string;
  email?: string;
  role?: string;
  employee?: {
    firstName?: string;
    lastName?: string;
    employeeCode?: string;
    department?: { id?: string; name?: string } | null;
  } | null;
}

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  senderUserId?: string;
  sender?: Person | null;
}

export interface Thread {
  id: string;
  title?: string | null;
  isDirect?: boolean;
  createdAt?: string;
  updatedAt?: string;
  members?: Array<{ userId?: string; user?: Person | null }>;
  messages?: ChatMessage[];
}
