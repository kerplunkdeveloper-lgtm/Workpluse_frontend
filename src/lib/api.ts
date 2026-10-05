import axios from "axios";
import { getSessionAccessToken, setSessionAccessToken } from "./sessionToken";
export { getSessionAccessToken, setSessionAccessToken } from "./sessionToken";

function normalizeApiUrl(url: string): string {
  let next = url.trim();
  if (!next.startsWith("http://") && !next.startsWith("https://")) {
    next = `https://${next}`;
  }
  next = next.replace(/\/+$/, "");
  if (!next.endsWith("/api")) {
    next = `${next}/api`;
  }
  return next;
}

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_PROXY !== "false") {
    return "/backend-api";
  }

  const remoteOverride = process.env.NEXT_PUBLIC_USE_REMOTE_API === "true";
  let url = (process.env.NEXT_PUBLIC_API_URL || "").trim();

  // `next dev` / local Node always hits the machine's Express API unless the
  // remote override is set. The committed .env still points at Railway.
  if (process.env.NODE_ENV !== "production" && !remoteOverride) {
    url = (process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:5000/api").trim();
  }

  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_API_URL is required in production");
    }
    return "http://localhost:5000/api";
  }

  return normalizeApiUrl(url);
}

const API_BASE_URL = getApiBaseUrl();
const WEB_DEVICE_KEY = "workpulse_device_id";

export function getWebDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(WEB_DEVICE_KEY);
  if (!id) {
    id = typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
    localStorage.setItem(WEB_DEVICE_KEY, id);
  }
  return id;
}

function forceSessionLogout() {
  if (typeof window === "undefined") return;
  setSessionAccessToken(null);
  delete api.defaults.headers.common.Authorization;
  // Remove credentials left by older WorkPulse releases.
  localStorage.removeItem("workpulse_access_token");
  localStorage.removeItem("workpulse_refresh_token");
  localStorage.removeItem("workpulse_user");
  window.dispatchEvent(new Event("workpulse:unauthorized"));
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function isFormDataBody(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  if (typeof FormData !== "undefined" && data instanceof FormData) return true;
  return (data as { constructor?: { name?: string } }).constructor?.name === "FormData";
}

function stripFormDataContentType(headers: unknown) {
  if (!headers) return;
  const bag = headers as { delete?: (name: string) => void; [key: string]: unknown };
  if (typeof bag.delete === "function") {
    bag.delete("Content-Type");
    bag.delete("content-type");
    return;
  }
  delete bag["Content-Type"];
  delete bag["content-type"];
}

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    if (isFormDataBody(config.data)) {
      stripFormDataContentType(config.headers);
    }
    if (typeof window !== "undefined") {
      const token = getSessionAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        delete config.headers.Authorization;
      }
      const deviceId = getWebDeviceId();
      if (deviceId) {
        config.headers["x-device-id"] = deviceId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest.url?.includes("/auth/login")) {
      forceSessionLogout();
    }

    if (typeof window !== "undefined" && error.response?.status === 402) {
      const payload = error.response.data || {};
      window.dispatchEvent(new CustomEvent("workpulse:billing", { detail: payload }));
        // AuthContext refreshes the user entitlement and ProtectedRoute renders
        // the correct recovery UI. Avoid relying on a stale role cached in storage.
    }

    return Promise.reject(error);
  }
);

/* ==========================================
 * Domain API Services
 * ========================================== */

export const authApi = {
  loginWithGoogle: async (idToken: string) => {
    const res = await api.post("/auth/google", { idToken, client: "web" });
    return res.data;
  },
  login: async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password, client: "web" });
    return res.data;
  },
  register: async (payload: any) => {
    const res = await api.post("/auth/register", { ...payload, client: "web" });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },
  logout: async () => {
    const res = await api.post("/auth/logout", { client: "web" });
    return res.data;
  },
  refreshSession: async () => {
    throw new Error("Refresh tokens are disabled. Please sign in again.");
  },
  getPlans: async () => {
    const res = await api.get("/auth/plans");
    return res.data;
  },
  activatePlan: async (unlockCode: string) => {
    const res = await api.post("/auth/activate-plan", { unlockCode });
    return res.data;
  },
  changePassword: async (payload: { currentPassword?: string; newPassword: string }) => {
    const res = await api.post("/auth/change-password", payload);
    return res.data;
  },
  forgotPassword: async (email: string) => {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data;
  },
  resetPassword: async (payload: { token: string; newPassword: string }) => {
    const res = await api.post("/auth/reset-password", payload);
    return res.data;
  },
  uploadAvatar: async (file: File) => {
    const form = new FormData();
    form.append("image", file);
    const res = await api.post("/auth/avatar", form);
    return res.data;
  },
  removeAvatar: async () => {
    const res = await api.put("/auth/me", { avatarUrl: null });
    return res.data;
  },
};

export const attendanceApi = {
  checkIn: async (data: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    workMode?: string;
    note?: string;
    locationLabel?: string;
  }) => {
    const res = await api.post("/attendance/check-in", {
      ...data,
      deviceId: getWebDeviceId(),
      timestamp: new Date().toISOString(),
    });
    return res.data;
  },
  checkOut: async (data: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    workMode?: string;
    note?: string;
    locationLabel?: string;
  }) => {
    const res = await api.post("/attendance/check-out", {
      ...data,
      deviceId: getWebDeviceId(),
      timestamp: new Date().toISOString(),
    });
    return res.data;
  },
  wfhCheckIn: async (wfhNote?: string) => {
    const res = await api.post("/attendance/wfh-check-in", {
      timestamp: new Date().toISOString(),
      wfhNote: wfhNote || "Remote work from home",
      deviceId: getWebDeviceId(),
    });
    return res.data;
  },
  startBreak: async (coords?: { latitude: number; longitude: number }) => {
    const res = await api.post("/attendance/break-start", coords || {});
    return res.data;
  },
  endBreak: async (coords?: { latitude: number; longitude: number }) => {
    const res = await api.post("/attendance/break-end", coords || {});
    return res.data;
  },
  getTodayStatus: async () => {
    const res = await api.get("/attendance/today");
    return res.data;
  },
  getLiveToday: async () => {
    const res = await api.get("/attendance/live-today");
    return res.data;
  },
  getMyAttendance: async (params?: any) => {
    const res = await api.get("/attendance/my", { params });
    return res.data;
  },
  getAllAttendance: async (params?: any) => {
    const res = await api.get("/attendance/all", { params });
    return res.data;
  },
  getSummary: async (date?: string, branchId?: string) => {
    const res = await api.get("/attendance/summary", { params: { date, branchId } });
    return res.data;
  },
  adminMarkAttendance: async (payload: {
    employeeId: string;
    date: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
    reason?: string;
  }) => {
    const res = await api.post("/attendance/admin-mark", payload);
    return res.data;
  },
  // Batch sync offline punches after connectivity is restored
  syncOffline: async (punches: Array<{
    id: string;
    type: string;
    timestamp: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    wfhNote?: string;
    workMode?: string;
    note?: string;
    deviceId?: string;
    locationLabel?: string;
  }>) => {
    const res = await api.post("/attendance/sync-offline", { punches });
    return res.data;
  },
};

export const correctionsApi = {
  request: async (payload: { attendanceId: string; date?: string; requestedCheckIn?: string; requestedCheckOut?: string; reason: string }) => {
    const res = await api.post("/attendance/corrections/request", payload);
    return res.data;
  },
  getMyCorrections: async () => {
    const res = await api.get("/attendance/corrections/my");
    return res.data;
  },
  getPendingCorrections: async () => {
    const res = await api.get("/attendance/corrections/pending");
    return res.data;
  },
  review: async (id: string, payload: { status: "APPROVED" | "REJECTED"; reviewNote?: string }) => {
    const res = await api.post(`/attendance/corrections/${id}/review`, payload);
    return res.data;
  },
};

export const leavesApi = {
  getTypes: async () => {
    const res = await api.get("/leaves/types");
    return res.data;
  },
  createType: async (payload: any) => {
    const res = await api.post("/leaves/types", payload);
    return res.data;
  },
  updateType: async (id: string, payload: any) => {
    const res = await api.put(`/leaves/types/${id}`, payload);
    return res.data;
  },
  deleteType: async (id: string) => {
    const res = await api.delete(`/leaves/types/${id}`);
    return res.data;
  },
  carryForward: async (payload: { fromYear?: number; toYear?: number; maxDays?: number }) => {
    const res = await api.post("/leaves/carry-forward", payload);
    return res.data;
  },
  getBalances: async () => {
    const res = await api.get("/leaves/balances");
    return res.data;
  },
  apply: async (payload: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    isHalfDay?: boolean;
  }) => {
    const res = await api.post("/leaves/apply", payload);
    return res.data;
  },
  getMyLeaves: async () => {
    const res = await api.get("/leaves/my");
    return res.data;
  },
  getAllLeaves: async (params?: any) => {
    const res = await api.get("/leaves", { params });
    return res.data;
  },
  review: async (id: string, payload: { status: "APPROVED" | "REJECTED"; reviewNote?: string }) => {
    const res = await api.put(`/leaves/${id}/review`, payload);
    return res.data;
  },
};

export const payrollApi = {
  getMyPayslips: async () => {
    const res = await api.get("/payroll/my-payslips");
    return res.data;
  },
  getPayslips: async (params?: any) => {
    const res = await api.get("/payroll/payslips", { params });
    return res.data;
  },
  getPayslipDetails: async (id: string) => {
    const res = await api.get(`/payroll/payslips/${id}/details`);
    return res.data;
  },
  getSalaryStructure: async (employeeId: string) => {
    const res = await api.get(`/payroll/salary-structure/${employeeId}`);
    return res.data;
  },
  upsertSalaryStructure: async (payload: any) => {
    const res = await api.post("/payroll/salary-structure", payload);
    return res.data;
  },
  calculatePreview: async (params: { month: number; year: number; employeeId?: string }) => {
    const res = await api.get("/payroll/calculate", { params });
    return res.data;
  },
  generateBatch: async (payload: { month: number; year: number }) => {
    const res = await api.post("/payroll/generate", payload);
    return res.data;
  },
  approveBatch: async (payload: { batchId?: string; month?: number; year?: number }) => {
    const res = await api.post("/payroll/approve-batch", payload);
    return res.data;
  },
  disburseBatch: async (payload: { batchId?: string; month?: number; year?: number }) => {
    const res = await api.post("/payroll/disburse-batch", payload);
    return res.data;
  },
  getReports: async (params?: any) => {
    const res = await api.get("/payroll/reports", { params });
    return res.data;
  },
  getItDeclaration: async (params?: { employeeId?: string; financialYear?: string }) => {
    const res = await api.get("/payroll/it-declaration", { params });
    return res.data;
  },
  saveItDeclaration: async (payload: any) => {
    const res = await api.put("/payroll/it-declaration", payload);
    return res.data;
  },
  previewTds: async (params?: { employeeId?: string; financialYear?: string }) => {
    const res = await api.get("/payroll/tds-preview", { params });
    return res.data;
  },
  generateForm16: async (payload: { employeeId?: string; financialYear?: string }) => {
    const res = await api.post("/payroll/form-16/generate", payload);
    return res.data;
  },
  downloadForm16Html: async (params?: { employeeId?: string; financialYear?: string }) => {
    const res = await api.get("/payroll/form-16", { params, responseType: "blob" });
    return res.data;
  },
  downloadExport: async (kind: "pf-ecr" | "esi" | "neft", month: number, year: number) => {
    const res = await api.get(`/payroll/exports/${kind}`, {
      params: { month, year },
      responseType: "blob",
    });
    return res;
  },
  listExports: async () => {
    const res = await api.get("/payroll/exports");
    return res.data;
  },
  downloadSavedExport: async (id: string) => {
    return api.get(`/payroll/exports/${id}/download`, { responseType: "blob" });
  },
};

export const billingApi = {
  checkout: async (payload: { plan: string; billingCycle: string; couponCode?: string; idempotencyKey?: string }) => {
    const res = await api.post("/billing/checkout", payload);
    return res.data;
  },
  verify: async (payload: any) => {
    const res = await api.post("/billing/verify", payload);
    return res.data;
  },
  orders: async () => {
    const res = await api.get("/billing/orders");
    return res.data;
  },
  cancel: async () => {
    const res = await api.post("/billing/cancel");
    return res.data;
  },
};

export const billingAdminApi = {
  prices: async () => {
    const res = await api.get("/admin/billing/prices");
    return res.data;
  },
  updatePrice: async (plan: string, billingCycle: string, payload: { priceInr: number; isActive?: boolean }) => {
    const res = await api.put(`/admin/billing/prices/${plan}/${billingCycle}`, payload);
    return res.data;
  },
  offers: async () => {
    const res = await api.get("/admin/billing/offers");
    return res.data;
  },
  createOffer: async (payload: any) => {
    const res = await api.post("/admin/billing/offers", payload);
    return res.data;
  },
  updateOffer: async (id: string, payload: any) => {
    const res = await api.put(`/admin/billing/offers/${id}`, payload);
    return res.data;
  },
  deactivateOffer: async (id: string) => {
    const res = await api.delete(`/admin/billing/offers/${id}`);
    return res.data;
  },
};

export const orgApi = {
  get: async () => {
    const res = await api.get("/organization");
    return res.data;
  },
  update: async (payload: any) => {
    const res = await api.put("/organization", payload);
    return res.data;
  },
};

export const loansApi = {
  list: async () => {
    const res = await api.get("/loans");
    return res.data;
  },
  apply: async (payload: any) => {
    const res = await api.post("/loans", payload);
    return res.data;
  },
  review: async (id: string, payload: any) => {
    const res = await api.put(`/loans/${id}/review`, payload);
    return res.data;
  },
};

export const appraisalsApi = {
  list: async () => {
    const res = await api.get("/appraisals");
    return res.data;
  },
  create: async (payload: any) => {
    const res = await api.post("/appraisals", payload);
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/appraisals/${id}`);
    return res.data;
  },
  mine: async () => {
    const res = await api.get("/appraisals/mine");
    return res.data;
  },
  submitSelf: async (id: string, payload: any) => {
    const res = await api.put(`/appraisals/reviews/${id}/self`, payload);
    return res.data;
  },
  submitManager: async (id: string, payload: any) => {
    const res = await api.put(`/appraisals/reviews/${id}/manager`, payload);
    return res.data;
  },
};

export const apiKeysApi = {
  list: async () => {
    const res = await api.get("/api-keys");
    return res.data;
  },
  create: async (name: string) => {
    const res = await api.post("/api-keys", { name });
    return res.data;
  },
  revoke: async (id: string) => {
    const res = await api.delete(`/api-keys/${id}`);
    return res.data;
  },
};

export const chatApi = {
  teammates: async () => {
    const res = await api.get("/chat/teammates");
    return res.data;
  },
  threads: async () => {
    const res = await api.get("/chat/threads");
    return res.data;
  },
  open: async (userId: string) => {
    const res = await api.post("/chat/threads", { userId });
    return res.data;
  },
  createGroup: async (payload: { title: string; userIds: string[] }) => {
    const res = await api.post("/chat/groups", payload);
    return res.data;
  },
  messages: async (threadId: string) => {
    const res = await api.get(`/chat/threads/${threadId}/messages`);
    return res.data;
  },
  send: async (threadId: string, body: string) => {
    const res = await api.post(`/chat/threads/${threadId}/messages`, { body });
    return res.data;
  },
};

export const biometricApi = {
  list: async () => {
    const res = await api.get("/biometric");
    return res.data;
  },
  create: async (payload: { name: string; location?: string }) => {
    const res = await api.post("/biometric", payload);
    return res.data;
  },
  revoke: async (id: string) => {
    const res = await api.delete(`/biometric/${id}`);
    return res.data;
  },
};

export const payslipTemplatesApi = {
  getPresets: async () => {
    const res = await api.get("/payroll/templates/presets");
    return res.data;
  },
  getTemplate: async () => {
    const res = await api.get("/payroll/templates");
    return res.data;
  },
  saveTemplate: async (payload: any) => {
    const res = await api.post("/payroll/templates", payload);
    return res.data;
  },
  resetPreset: async (presetKey: string) => {
    const res = await api.post("/payroll/templates/reset", { presetKey });
    return res.data;
  },
  uploadAsset: async (formData: FormData) => {
    const res = await api.post("/payroll/templates/upload-asset", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  uploadHtmlTemplate: async (formDataOrPayload: FormData | { html: string; name?: string }) => {
    const isFormData = typeof FormData !== "undefined" && formDataOrPayload instanceof FormData;
    const res = await api.post("/payroll/templates/upload-html", formDataOrPayload, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return res.data;
  },
};

export const onboardingApi = {
  listCandidates: async () => {
    const res = await api.get("/onboarding");
    return res.data;
  },
  createJoiner: async (payload: any) => {
    const res = await api.post("/onboarding", payload);
    return res.data;
  },
  getCandidateDetails: async (id: string) => {
    const res = await api.get(`/onboarding/${id}`);
    return res.data;
  },
  hrVerify: async (id: string, payload: any) => {
    const res = await api.put(`/onboarding/${id}/hr-verify`, payload);
    return res.data;
  },
  adminApproveOffer: async (id: string, payload?: any) => {
    const res = await api.post(`/onboarding/${id}/admin-approve-offer`, payload || {});
    return res.data;
  },
  hrSendOffer: async (id: string, payload?: any) => {
    const res = await api.post(`/onboarding/${id}/hr-send-offer`, payload || {});
    return res.data;
  },
  adminActivate: async (id: string, payload?: any) => {
    const res = await api.post(`/onboarding/${id}/admin-approve`, payload || {});
    return res.data;
  },
  getPortalCandidate: async (token: string) => {
    const res = await api.get(`/onboarding/portal/${token}`);
    return res.data;
  },
  updatePortalProfile: async (token: string, payload: any) => {
    const res = await api.put(`/onboarding/portal/${token}/profile`, payload);
    return res.data;
  },
  uploadPortalDocument: async (token: string, formData: FormData) => {
    const res = await api.post(`/onboarding/portal/${token}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  respondOffer: async (token: string, response: "ACCEPTED" | "REJECTED", note?: string) => {
    const res = await api.post(`/onboarding/portal/${token}/respond-offer`, {
      response,
      note,
    });
    return res.data;
  },
};

export const employeesApi = {
  list: async (params?: any) => {
    const res = await api.get("/employees", { params });
    return res.data;
  },
  getAll: async (params?: any) => {
    const res = await api.get("/employees", { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/employees/${id}`);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get("/employees/me");
    return res.data;
  },
  updateMe: async (payload: any) => {
    const res = await api.put("/employees/me", payload);
    return res.data;
  },
  uploadMyAvatar: async (file: File) => {
    const form = new FormData();
    form.append("image", file);
    const res = await api.post("/employees/me/avatar", form);
    return res.data;
  },
  uploadAvatar: async (employeeId: string, file: File) => {
    const form = new FormData();
    form.append("image", file);
    const res = await api.post(`/employees/${employeeId}/avatar`, form);
    return res.data;
  },
  create: async (payload: any) => {
    const res = await api.post("/employees", payload);
    return res.data;
  },
  update: async (id: string, payload: any) => {
    const res = await api.put(`/employees/${id}`, payload);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/employees/${id}`);
    return res.data;
  },
  invite: async (payload: any) => {
    const res = await api.post("/employees/invite", payload);
    return res.data;
  },
  inviteEmployee: async (payload: any) => {
    const res = await api.post("/employees/invite", payload);
    return res.data;
  },
  // Employee Documents
  getDocuments: async (employeeId: string) => {
    const res = await api.get(`/employees/${employeeId}/documents`);
    return res.data;
  },
  uploadDocument: async (employeeId: string, formDataOrPayload: FormData | any) => {
    const isFormData = typeof FormData !== "undefined" && formDataOrPayload instanceof FormData;
    const res = await api.post(`/employees/${employeeId}/documents`, formDataOrPayload, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return res.data;
  },
  updateDocument: async (employeeId: string, docId: string, formDataOrPayload: FormData | any) => {
    const isFormData = typeof FormData !== "undefined" && formDataOrPayload instanceof FormData;
    const res = await api.put(`/employees/${employeeId}/documents/${docId}`, formDataOrPayload, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return res.data;
  },
  deleteDocument: async (employeeId: string, docId: string) => {
    const res = await api.delete(`/employees/${employeeId}/documents/${docId}`);
    return res.data;
  },
  verifyDocument: async (employeeId: string, docId: string, payload: { status: string; rejectionReason?: string }) => {
    const res = await api.post(`/employees/${employeeId}/documents/${docId}/verify`, payload);
    return res.data;
  },
  sendExpiryReminder: async (employeeId: string, docId: string) => {
    const res = await api.post(`/employees/${employeeId}/documents/${docId}/remind-expiry`);
    return res.data;
  },
};



export const branchesApi = {
  list: async () => {
    const res = await api.get("/branches");
    return res.data;
  },
  create: async (payload: any) => {
    const res = await api.post("/branches", payload);
    return res.data;
  },
  update: async (id: string, payload: any) => {
    const res = await api.put(`/branches/${id}`, payload);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/branches/${id}`);
    return res.data;
  },
};

export const departmentsApi = {
  list: async () => {
    const res = await api.get("/departments");
    return res.data;
  },
  create: async (payload: any) => {
    const res = await api.post("/departments", payload);
    return res.data;
  },
  update: async (id: string, payload: any) => {
    const res = await api.put(`/departments/${id}`, payload);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/departments/${id}`);
    return res.data;
  },
};

export const shiftsApi = {
  list: async () => {
    const res = await api.get("/shifts");
    return res.data;
  },
  create: async (payload: any) => {
    const res = await api.post("/shifts", payload);
    return res.data;
  },
  update: async (id: string, payload: any) => {
    const res = await api.put(`/shifts/${id}`, payload);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/shifts/${id}`);
    return res.data;
  },
  assign: async (id: string, employeeIds: string[]) => {
    const res = await api.post(`/shifts/${id}/assign`, { employeeIds });
    return res.data;
  },
};

export const shiftOverridesApi = {
  list: async (params?: { from?: string; to?: string; employeeId?: string }) => {
    const res = await api.get("/shift-overrides", { params });
    return res.data;
  },
  set: async (payload: { employeeId: string; date: string; shiftId: string; reason?: string }) => {
    const res = await api.post("/shift-overrides", payload);
    return res.data;
  },
  remove: async (employeeId: string, date: string) => {
    const res = await api.delete("/shift-overrides", { params: { employeeId, date } });
    return res.data;
  },
};

export async function registerWebDevice() {
  const deviceId = getWebDeviceId();
  if (!deviceId) return;
  try {
    await devicesApi.register({
      deviceId,
      deviceModel: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : "Web",
      osVersion: "web",
    });
  } catch {
    // Admins without an employee profile cannot register a device.
  }
}

export const devicesApi = {
  list: async () => {
    const res = await api.get("/devices");
    return res.data;
  },
  my: async () => {
    const res = await api.get("/devices/my");
    return res.data;
  },
  register: async (payload: { deviceId: string; deviceModel?: string; osVersion?: string }) => {
    const res = await api.post("/devices/register", payload);
    return res.data;
  },
  setTrust: async (id: string, isTrusted: boolean) => {
    const res = await api.put(`/devices/${id}/trust`, { isTrusted });
    return res.data;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/devices/${id}`);
    return res.data;
  },
};

export const auditApi = {
  list: async (params?: { action?: string; entity?: string; page?: number; limit?: number }) => {
    const res = await api.get("/audit-logs", { params });
    return res.data;
  },
};

export const expensesApi = {
  create: async (payload: any) => {
    const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
    const res = await api.post("/expenses", payload, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return res.data;
  },
  getMyClaims: async () => {
    const res = await api.get("/expenses/my");
    return res.data;
  },
  getSummary: async () => {
    const res = await api.get("/expenses/summary");
    return res.data;
  },
  getAllClaims: async () => {
    const res = await api.get("/expenses");
    return res.data;
  },
  review: async (id: string, payload: { status: "APPROVED" | "REJECTED"; reviewNote?: string }) => {
    const res = await api.patch(`/expenses/${id}/review`, payload);
    return res.data;
  },
  deleteClaim: async (id: string) => {
    const res = await api.delete(`/expenses/${id}`);
    return res.data;
  },
};

export const notificationsApi = {
  getAll: async () => {
    const res = await api.get("/notifications");
    return res.data;
  },
  markRead: async (id: string) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },
  markAllRead: async () => {
    const res = await api.put("/notifications/read-all");
    return res.data;
  },
  getCommunicationStatus: async () => {
    const res = await api.get("/notifications/communication-status");
    return res.data;
  },
  testEmail: async (to?: string) => {
    const res = await api.post("/notifications/test-email", { to });
    return res.data;
  },
  testWhatsApp: async (to?: string) => {
    const res = await api.post("/notifications/test-whatsapp", { to });
    return res.data;
  },
  triggerReminders: async (reminderType?: "MORNING" | "EVENING" | "ALL") => {
    const res = await api.post("/notifications/trigger-reminders", { reminderType });
    return res.data;
  },
};

export const holidaysApi = {
  list: async (params?: { year?: number; branchId?: string; type?: string }) => {
    const res = await api.get("/holidays", { params });
    return res.data;
  },
  upcoming: async (params?: { branchId?: string; limit?: number }) => {
    const res = await api.get("/holidays/upcoming", { params });
    return res.data;
  },
  create: async (payload: {
    name: string;
    date: string;
    type?: string;
    branchId?: string | null;
    description?: string;
    isOptional?: boolean;
  }) => {
    const res = await api.post("/holidays", payload);
    return res.data;
  },
  update: async (id: string, payload: any) => {
    const res = await api.put(`/holidays/${id}`, payload);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/holidays/${id}`);
    return res.data;
  },
  bulk: async (holidays: any[]) => {
    const res = await api.post("/holidays/bulk", { holidays });
    return res.data;
  },
};

export const policyApi = {
  get: async () => {
    const res = await api.get("/policy");
    return res.data;
  },
  update: async (payload: any) => {
    const res = await api.put("/policy", payload);
    return res.data;
  },
};

export const reportsApi = {
  getDaily: async (date?: string) => {
    const res = await api.get("/reports/daily", { params: { date } });
    return res.data;
  },
  getMonthly: async (month?: number, year?: number) => {
    const res = await api.get("/reports/monthly", { params: { month, year } });
    return res.data;
  },
};

export const compOffApi = {
  getBalance: async () => {
    const res = await api.get("/compoff/balance");
    return res.data;
  },
  redeem: async (payload: { requestedDate: string; days: number; reason?: string }) => {
    const res = await api.post("/compoff/redeem", payload);
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get("/compoff/history");
    return res.data;
  },
  review: async (id: string, payload: { status: "APPROVED" | "REJECTED"; reviewNote?: string }) => {
    const res = await api.post(`/compoff/${id}/review`, payload);
    return res.data;
  },
};

export const overtimeApi = {
  request: async (payload: { date?: string; hours: number; reason: string }) => {
    const res = await api.post("/overtime/request", payload);
    return res.data;
  },
  getPending: async () => {
    const res = await api.get("/overtime/pending");
    return res.data;
  },
  getMy: async () => {
    const res = await api.get("/overtime/my");
    return res.data;
  },
  review: async (id: string, payload: { status: "APPROVED" | "REJECTED"; reviewNote?: string }) => {
    const res = await api.patch(`/overtime/${id}/review`, payload);
    return res.data;
  },
};

export const offboardingApi = {
  list: async (params?: any) => {
    const res = await api.get("/offboarding", { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/offboarding/${id}`);
    return res.data;
  },
  getMyExit: async () => {
    const res = await api.get("/offboarding/my-exit");
    return res.data;
  },
  initiate: async (payload: any) => {
    const res = await api.post("/offboarding/initiate", payload);
    return res.data;
  },
  review: async (id: string, payload: any) => {
    const res = await api.post(`/offboarding/${id}/review`, payload);
    return res.data;
  },
  updateClearance: async (id: string, clearanceId: string, payload: any) => {
    const res = await api.put(`/offboarding/${id}/clearances/${clearanceId}`, payload);
    return res.data;
  },
  saveInterview: async (id: string, payload: any) => {
    const res = await api.post(`/offboarding/${id}/interview`, payload);
    return res.data;
  },
  calculateSettlement: async (id: string, payload?: any) => {
    const res = await api.post(`/offboarding/${id}/calculate-settlement`, payload || {});
    return res.data;
  },
  disburseAndTerminate: async (id: string, payload: any) => {
    const res = await api.post(`/offboarding/${id}/disburse-and-terminate`, payload);
    return res.data;
  },
  getDocument: async (id: string, docType: string) => {
    const res = await api.get(`/offboarding/${id}/documents/${docType}`);
    return res.data;
  },
};

export const assetsApi = {
  getAll: async (params?: {
    category?: string;
    status?: string;
    condition?: string;
    assignedToId?: string;
    search?: string;
  }) => {
    const res = await api.get("/assets", { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/assets/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post("/assets", data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/assets/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/assets/${id}`);
    return res.data;
  },
  assign: async (
    id: string,
    data: { employeeId: string; conditionOnAssign?: string; remarks?: string }
  ) => {
    const res = await api.post(`/assets/${id}/assign`, data);
    return res.data;
  },
  return: async (
    id: string,
    data: { conditionOnReturn?: string; recoveryCharge?: number; remarks?: string }
  ) => {
    const res = await api.post(`/assets/${id}/return`, data);
    return res.data;
  },
  transfer: async (
    id: string,
    data: { toEmployeeId: string; condition?: string; remarks?: string }
  ) => {
    const res = await api.post(`/assets/${id}/transfer`, data);
    return res.data;
  },
  logMaintenance: async (
    id: string,
    data: { issueDescription: string; vendorName?: string; cost?: number; startDate?: string; notes?: string }
  ) => {
    const res = await api.post(`/assets/${id}/maintenance`, data);
    return res.data;
  },
  completeMaintenance: async (
    id: string,
    maintenanceId: string,
    data: { completedDate?: string; cost?: number; newCondition?: string; status?: string; notes?: string }
  ) => {
    const res = await api.put(`/assets/${id}/maintenance/${maintenanceId}/complete`, data);
    return res.data;
  },
  getMyAssets: async () => {
    const res = await api.get("/assets/my-assets");
    return res.data;
  },
  getEmployeeAssets: async (employeeId: string) => {
    const res = await api.get(`/assets/employee/${employeeId}`);
    return res.data;
  },
};
