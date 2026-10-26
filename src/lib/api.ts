import axios from "axios";
import { getSessionAccessToken, isSessionHydrated, setSessionAccessToken } from "./sessionToken";
export { getSessionAccessToken, markSessionHydrated, setSessionAccessToken } from "./sessionToken";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Optional/background call. Its caller already copes with a failure, so it must not raise the full-screen outage overlay. */
    skipGlobalError?: boolean;
    /** Internal: how many times a transient failure of this request has been retried. */
    _transientRetries?: number;
  }
}

const BACKGROUND_REQUEST = { skipGlobalError: true } as const;

// A GET is safe to repeat. Brief database or network hiccups (a pooled
// connection dropped, the API restarting) usually clear within a second or two,
// so retry before the user ever sees a failure.
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);
const MAX_TRANSIENT_RETRIES = 2;
const TRANSIENT_RETRY_DELAY_MS = 400;

// Whether the outage overlay is currently up, so the next success can clear it.
let outageSignalled = false;

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
    return "/api";
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

function forceSessionLogout(failedToken?: string) {
  if (typeof window === "undefined") return;
  // During the first render, page-level data requests can receive a 401
  // before AuthProvider has restored the saved token. Never destroy a valid
  // persisted session during that hydration window.
  if (!isSessionHydrated()) return;
  const currentToken = getSessionAccessToken();
  if (failedToken && currentToken && failedToken !== currentToken) return;
  setSessionAccessToken(null);
  delete api.defaults.headers.common.Authorization;
  // Remove credentials left by older WorkPluse releases.
  localStorage.removeItem("workpulse_access_token");
  localStorage.removeItem("workpulse_refresh_token");
  localStorage.removeItem("workpulse_user");
  window.dispatchEvent(new Event("workpulse:unauthorized"));
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

let accessRefreshPromise: Promise<string | null> | null = null;

async function refreshAccessTokenSilently(): Promise<string | null> {
  if (!accessRefreshPromise) {
    const storedRefresh =
      typeof window !== "undefined"
        ? window.localStorage.getItem("workpulse_refresh_token")
        : null;

    accessRefreshPromise = api
      .post("/auth/refresh", {
        client: "web",
        refreshToken: storedRefresh || undefined,
      })
      .then((response) => {
        const nextToken =
          response.data?.data?.accessToken || response.data?.data?.token || null;
        const nextRefresh = response.data?.data?.refreshToken || null;

        if (nextToken) setSessionAccessToken(nextToken);
        if (nextRefresh && typeof window !== "undefined") {
          try {
            window.localStorage.setItem("workpulse_refresh_token", nextRefresh);
          } catch {}
        }
        return nextToken;
      })
      .catch(() => null)
      .finally(() => {
        accessRefreshPromise = null;
      });
  }
  return accessRefreshPromise;
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
  (response) => {
    // The server answered, so any outage screen from earlier is out of date.
    if (outageSignalled && typeof window !== "undefined") {
      outageSignalled = false;
      window.dispatchEvent(new Event("workpulse:server-recovered"));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) return Promise.reject(error);

    // A request the page itself cancelled (navigation, unmount) is not an outage.
    const serverFailure = !axios.isCancel(error) && (!error.response || error.response.status >= 500);
    const retryable = serverFailure && (!error.response || RETRYABLE_STATUSES.has(error.response.status));
    const method = String(originalRequest.method || "get").toLowerCase();
    const attempts = originalRequest._transientRetries ?? 0;

    if (retryable && method === "get" && attempts < MAX_TRANSIENT_RETRIES) {
      originalRequest._transientRetries = attempts + 1;
      await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS * (attempts + 1)));
      return api(originalRequest);
    }

    if (typeof window !== "undefined" && serverFailure && !originalRequest.skipGlobalError) {
      outageSignalled = true;
      window.dispatchEvent(new CustomEvent("workpulse:server-error", {
        detail: { kind: error.response ? "server" : "network", status: error.response?.status ?? 0 },
      }));
    }

    if (error.response?.status === 401 && !originalRequest.url?.includes("/auth/login") && !originalRequest.url?.includes("/auth/refresh") && !originalRequest.url?.includes("/auth/me")) {
      const retryableRequest = originalRequest as typeof originalRequest & { _workpulseRetry?: boolean };
      if (!retryableRequest._workpulseRetry) {
        retryableRequest._workpulseRetry = true;
        const refreshedToken = await refreshAccessTokenSilently();
        if (refreshedToken) {
          retryableRequest.headers = retryableRequest.headers || {};
          retryableRequest.headers.Authorization = "Bearer " + refreshedToken;
          return api(retryableRequest);
        }
      }

      const authorization = originalRequest.headers?.Authorization || originalRequest.headers?.authorization;
      const failedToken = typeof authorization === "string" && authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : undefined;
      forceSessionLogout(failedToken);
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
  discoverSso: async (email: string) => {
    const res = await api.post("/auth/sso/discover", { email });
    return res.data;
  },
  exchangeSso: async (code: string) => {
    const res = await api.post("/auth/sso/exchange", { code });
    return res.data;
  },
  loginWithGoogle: async (idToken: string) => {
    const res = await api.post("/auth/google", { idToken, client: "web" });
    return res.data;
  },
  login: async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password, client: "web" });
    return res.data;
  },
  verifyTwoFactorLogin: async (challengeToken: string, code: string) => {
    const res = await api.post("/auth/2fa/verify-login", { challengeToken, code });
    return res.data;
  },
  beginTwoFactorSetup: async () => {
    const res = await api.post("/auth/2fa/setup");
    return res.data;
  },
  confirmTwoFactorSetup: async (code: string) => {
    const res = await api.post("/auth/2fa/confirm", { code });
    return res.data;
  },
  disableTwoFactor: async (code: string) => {
    const res = await api.post("/auth/2fa/disable", { code });
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
    const storedRefresh =
      typeof window !== "undefined"
        ? window.localStorage.getItem("workpulse_refresh_token")
        : null;
    const res = await api.post("/auth/logout", {
      client: "web",
      refreshToken: storedRefresh || undefined,
    });
    return res.data;
  },
  refreshSession: async () => {
    const storedRefresh =
      typeof window !== "undefined"
        ? window.localStorage.getItem("workpulse_refresh_token")
        : null;
    const res = await api.post("/auth/refresh", {
      client: "web",
      refreshToken: storedRefresh || undefined,
    });
    const nextRefresh = res.data?.data?.refreshToken;
    if (nextRefresh && typeof window !== "undefined") {
      try {
        window.localStorage.setItem("workpulse_refresh_token", nextRefresh);
      } catch {}
    }
    return res.data;
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
  verifyEmail: async (email: string, code: string) => {
    const res = await api.post("/auth/verify-email", { email, code, client: "web" });
    return res.data;
  },
  resendVerification: async (email: string) => {
    const res = await api.post("/auth/resend-verification", { email });
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
  startLunch: async (coords?: { latitude: number; longitude: number }) => {
    const res = await api.post("/attendance/lunch-start", coords || {});
    return res.data;
  },
  endLunch: async (coords?: { latitude: number; longitude: number }) => {
    const res = await api.post("/attendance/lunch-end", coords || {});
    return res.data;
  },
  // Both fall back gracefully in their callers, so a failure here is not an outage.
  getTodayStatus: async () => {
    const res = await api.get("/attendance/today", BACKGROUND_REQUEST);
    return res.data;
  },
  /** Today's present / leave / off / absent counts for each branch. Admin and HR only. */
  getBranchSummary: async () => {
    const res = await api.get("/attendance/branch-summary", BACKGROUND_REQUEST);
    return res.data;
  },
  getLiveToday: async () => {
    const res = await api.get("/attendance/live-today", BACKGROUND_REQUEST);
    return res.data;
  },
  getMyAttendance: async (params?: any) => {
    const res = await api.get("/attendance/my", { params });
    return res.data;
  },
  /** `background` marks a timer-driven refresh whose failure must not raise the outage overlay. */
  getAllAttendance: async (params?: any, options?: { background?: boolean }) => {
    const res = await api.get("/attendance/all", { params, ...(options?.background ? BACKGROUND_REQUEST : {}) });
    return res.data;
  },
  /** Date-range history. Admins and managers get the team; everyone else gets their own records. */
  getHistory: async (params: {
    from?: string;
    to?: string;
    date?: string;
    status?: string;
    employeeId?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get("/attendance/history", { params });
    return res.data;
  },
  getSummary: async (date?: string, branchId?: string, options?: { background?: boolean }) => {
    const res = await api.get("/attendance/summary", { params: { date, branchId }, ...(options?.background ? BACKGROUND_REQUEST : {}) });
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

export const dayOffWorkApi = {
  /** Ask HR or an admin to approve working today, a weekly off, holiday or company leave. */
  request: async (payload: { reasonType: string; note?: string }) => {
    const res = await api.post("/attendance/day-off-work", payload);
    return res.data;
  },
  getMine: async () => {
    const res = await api.get("/attendance/day-off-work/my");
    return res.data;
  },
  /** Admin and HR: requests for one status (or ALL), with per-status counts in `counts`. */
  getRequests: async (params: { status?: "PENDING" | "APPROVED" | "REJECTED" | "ALL"; limit?: number } = {}) => {
    const res = await api.get("/attendance/day-off-work", { params: { status: "PENDING", limit: 200, ...params } });
    return res.data;
  },
  review: async (id: string, payload: { status: "APPROVED" | "REJECTED"; reviewNote?: string }) => {
    const res = await api.post(`/attendance/day-off-work/${id}/review`, payload);
    return res.data;
  },
};

export const correctionsApi = {
  request: async (payload: { attendanceId?: string; date?: string; requestedCheckIn?: string; requestedCheckOut?: string; reason: string }) => {
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
  getAllCorrections: async () => {
    const res = await api.get("/attendance/corrections", { params: { status: "ALL", limit: 500 } });
    return res.data;
  },
  /** Requests for one status (or ALL), with per-status counts in `counts`. */
  getCorrections: async (params: { status?: "PENDING" | "APPROVED" | "REJECTED" | "ALL"; limit?: number; page?: number; employeeId?: string } = {}) => {
    const res = await api.get("/attendance/corrections", { params: { status: "PENDING", limit: 500, ...params } });
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
  getEligibility: async () => {
    const res = await api.get("/leaves/eligibility");
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

export const companyLeavesApi = {
  list: async (params?: { from?: string; to?: string }) => {
    const res = await api.get("/company-leaves", { params });
    return res.data;
  },
  create: async (payload: {
    title: string;
    reason?: string;
    startDate: string;
    endDate: string;
    isPaid: boolean;
    branchId?: string;
    notify?: boolean;
  }) => {
    const res = await api.post("/company-leaves", payload);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/company-leaves/${id}`);
    return res.data;
  },
};

export const permissionsApi = {
  my: async () => {
    const res = await api.get("/permissions/my");
    return res.data;
  },
  apply: async (payload: { date: string; hours: number; reason: string }) => {
    const res = await api.post("/permissions", payload);
    return res.data;
  },
  cancel: async (id: string) => {
    const res = await api.delete(`/permissions/${id}`);
    return res.data;
  },
  list: async (params?: { status?: string; employeeId?: string }) => {
    const res = await api.get("/permissions", { params });
    return res.data;
  },
  review: async (id: string, payload: { status: "APPROVED" | "REJECTED"; note?: string }) => {
    const res = await api.put(`/permissions/${id}/review`, payload);
    return res.data;
  },
};

export const payrollApi = {
  getCycle: async (month: number, year: number) => {
    const res = await api.get("/payroll/cycle", { params: { month, year } });
    return res.data;
  },
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
  downloadPayslipPdf: async (id: string) => {
    const res = await api.get(`/payroll/payslips/${id}/pdf`, {
      responseType: "blob",
    });
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
  bulkUpsertSalaryStructures: async (payload: {
    entries: { employeeId: string; annualCtc: number }[];
    split?: { basic: number; hra: number; special: number; other: number };
    notify?: boolean;
  }) => {
    const res = await api.post("/payroll/salary-structure/bulk", payload);
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
  quote: async (payload: { plan: string; billingCycle: string; couponCode?: string }) => {
    const res = await api.post("/billing/quote", payload);
    return res.data;
  },
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
  downloadInvoice: async (id: string) => api.get(`/billing/orders/${id}/invoice`, { responseType: "blob" }),
  cancel: async () => {
    const res = await api.post("/billing/cancel");
    return res.data;
  },
};

export const platformApi = {
  overview: async () => {
    const res = await api.get("/admin/platform/overview");
    return res.data;
  },
  revenue: async (days = 30) => {
    const res = await api.get("/admin/platform/revenue", { params: { days } });
    return res.data;
  },
  attention: async () => {
    const res = await api.get("/admin/platform/attention");
    return res.data;
  },
  activity: async (params?: { action?: string; clientId?: string; page?: number; limit?: number }) => {
    const res = await api.get("/admin/platform/activity", { params });
    return res.data;
  },
  clients: async (params?: {
    search?: string;
    plan?: string;
    status?: string;
    expiring?: boolean;
    sort?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get("/admin/platform/clients", { params });
    return res.data;
  },
  client: async (id: string) => {
    const res = await api.get(`/admin/platform/clients/${id}`);
    return res.data;
  },
  act: async (
    id: string,
    body: { action: "EXTEND" | "CHANGE_PLAN" | "SUSPEND" | "REACTIVATE"; days?: number; plan?: string; billingCycle?: string; reason?: string; confirmName?: string },
  ) => {
    const res = await api.post(`/admin/platform/clients/${id}/actions`, body);
    return res.data;
  },
  sendAdminPasswordReset: async (id: string) => {
    const res = await api.post(`/admin/platform/clients/${id}/admin-password-reset`);
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
  limits: async () => {
    const res = await api.get("/admin/billing/limits");
    return res.data;
  },
  updateLimit: async (plan: string, payload: { maxEmployees: number; maxBranches: number; hasGeofence: boolean; hasPayroll: boolean; hasShiftPlanner: boolean; hasApiAccess: boolean }) => {
    const res = await api.put(`/admin/billing/limits/${plan}`, payload);
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
  updateSso: async (payload: { enabled: boolean; issuer?: string; clientId?: string; clientSecret?: string; emailDomain?: string }) => {
    const res = await api.put("/organization", { sso: payload });
    return res.data;
  },
  uploadLogo: async (file: File) => {
    const form = new FormData();
    form.append("logo", file);
    const res = await api.post("/organization/logo", form);
    return res.data;
  },
  removeLogo: async () => {
    const res = await api.delete("/organization/logo");
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

export const announcementsApi = {
  list: async () => {
    const res = await api.get("/announcements");
    return res.data;
  },
  create: async (payload: any) => {
    const res = await api.post("/announcements", payload);
    return res.data;
  },
  update: async (id: string, payload: any) => {
    const res = await api.put(`/announcements/${id}`, payload);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/announcements/${id}`);
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

export const webhooksApi = {
  list: async () => (await api.get("/webhooks")).data,
  create: async (payload: { url: string; events?: string[] }) => (await api.post("/webhooks", payload)).data,
  update: async (id: string, payload: { url?: string; events?: string[]; isActive?: boolean }) => (await api.patch(`/webhooks/${id}`, payload)).data,
  remove: async (id: string) => (await api.delete(`/webhooks/${id}`)).data,
  test: async (id: string) => (await api.post(`/webhooks/${id}/test`)).data,
};

export const chatApi = {
  teammates: async (params?: { search?: string; page?: number; limit?: number }) => {
    const res = await api.get("/chat/teammates", { params });
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
  messages: async (threadId: string, params?: { page?: number; limit?: number }) => {
    const res = await api.get(`/chat/threads/${threadId}/messages`, { params });
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
  respondOffer: async (
    token: string,
    action: "ACCEPT" | "REJECT",
    signature?: string,
    reason?: string,
  ) => {
    const res = await api.post(`/onboarding/portal/${token}/respond-offer`, {
      action,
      signature,
      reason,
    });
    return res.data;
  },
};

export const employeesApi = {
  list: async (params?: any) => {
    const res = await api.get("/employees", { params });
    return res.data;
  },
  exportCsv: async (params?: { status?: string; departmentId?: string; branchId?: string }) => {
    const res = await api.get("/employees/export", { params });
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
  bulkSetAccess: async (ids: string[], action: "DEACTIVATE" | "ACTIVATE") => {
    const res = await api.post("/employees/bulk-access", { ids, action });
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
  limits: async () => {
    const res = await api.get("/admin/billing/limits");
    return res.data;
  },
  updateLimit: async (plan: string, payload: { maxEmployees: number; maxBranches: number; hasGeofence: boolean; hasPayroll: boolean; hasShiftPlanner: boolean; hasApiAccess: boolean }) => {
    const res = await api.put(`/admin/billing/limits/${plan}`, payload);
    return res.data;
  },
  resendInvite: async (id: string) => {
    const res = await api.post(`/employees/${id}/resend-invite`);
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
  bulkImport: async (employees: any[]) => {
    const res = await api.post("/employees/bulk-import", { employees });
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
  list: async (params?: { action?: string; entity?: string; from?: string; to?: string; page?: number; limit?: number }) => {
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
  broadcast: async (payload: { title: string; message: string }) => {
    const res = await api.post("/notifications/broadcast", payload);
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
  listLateComingLop: async () => {
    const res = await api.get("/policy/late-coming-lop");
    return res.data;
  },
  createLateComingLop: async (payload: any) => {
    const res = await api.post("/policy/late-coming-lop", payload);
    return res.data;
  },
  updateLateComingLop: async (id: string, payload: any) => {
    const res = await api.put(`/policy/late-coming-lop/${id}`, payload);
    return res.data;
  },
  deleteLateComingLop: async (id: string) => {
    const res = await api.delete(`/policy/late-coming-lop/${id}`);
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
  getPending: async () => {
    const res = await api.get("/compoff/pending");
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
  noticeSummary: async () => {
    const res = await api.get("/offboarding/notice-summary");
    return res.data;
  },
  withdraw: async (id: string) => {
    const res = await api.post(`/offboarding/${id}/withdraw`);
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
