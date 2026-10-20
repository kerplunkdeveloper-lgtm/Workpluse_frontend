"use client";

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, UserRole } from "@/types";
import {
  authApi,
  api,
  getSessionAccessToken,
  registerWebDevice,
  setSessionAccessToken,
  markSessionHydrated,
} from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";

interface RegistrationPayload {
  organizationName: string;
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  subscriptionPlan?: string;
  billingCycle?: "MONTHLY" | "ANNUAL";
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ message?: string; code?: string }>(error)) {
    const status = error.response?.status || 0;
    const code = error.response?.data?.code;
    if (status >= 500 || code === "AUTH_SERVICE_UNAVAILABLE") {
      return "Login service is temporarily unavailable. Please try again shortly.";
    }
    return error.response?.data?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  completeTwoFactorLogin: (code: string) => Promise<boolean>;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  register: (payload: RegistrationPayload) => Promise<boolean>;
  verifyEmail: (email: string, code: string, checkoutPlan?: string | null) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const authOperationRef = useRef(0);

  const go = (path: string) => {
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      router.replace(path);
    }, 0);
  };

  // A session is absolute: refresh-token rotation cannot extend this 30-day window.
  // Browsers cap setTimeout at roughly 24.8 days, so schedule the expiry in
  // safe chunks instead of passing the full 30-day duration at once.
  useEffect(() => {
    if (!user) return;

    const key = "workpulse_session_started_at";
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    const maxTimerDelay = 2_000_000_000;
    const saved = Number(localStorage.getItem(key));
    const startedAt = Number.isFinite(saved) && saved > 0 ? saved : Date.now();
    localStorage.setItem(key, String(startedAt));

    let timer: number | undefined;
    let expired = false;

    const expireSession = async () => {
      if (expired) return;
      expired = true;
      try { await authApi.logout(); } catch { /* session expiry is local even if the API is offline */ }
      localStorage.removeItem(key);
      localStorage.removeItem("workpulse_access_token");
      localStorage.removeItem("workpulse_refresh_token");
      localStorage.removeItem("workpulse_user");
      setSessionAccessToken(null);
      setUser(null);
      setToken(null);
      toast.info("Your 30-day session has expired. Please log in again.");
      go("/login");
    };

    const scheduleExpiryCheck = () => {
      const remaining = maxAge - (Date.now() - startedAt);
      if (remaining <= 0) {
        void expireSession();
        return;
      }
      timer = window.setTimeout(scheduleExpiryCheck, Math.min(remaining, maxTimerDelay));
    };

    scheduleExpiryCheck();
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [user]);
  const loadUser = async (authToken?: string) => {
    const operation = authOperationRef.current;
    try {
      let activeToken = authToken || getSessionAccessToken();
      if (!activeToken) {
        const refreshed = await authApi.refreshSession();
        activeToken = refreshed?.data?.accessToken || refreshed?.data?.token || null;
      }
      if (!activeToken) return;
      setSessionAccessToken(activeToken);
      setToken(activeToken);
      let res;
      try {
        res = await authApi.getMe();
      } catch (firstError) {
        // An access token may expire between visits. Re-issue it from the
        // HTTP-only refresh cookie before treating the session as invalid.
        const refreshed = await authApi.refreshSession();
        const refreshedToken = refreshed?.data?.accessToken || refreshed?.data?.token || null;
        if (!refreshedToken) throw firstError;
        activeToken = refreshedToken;
        setSessionAccessToken(activeToken);
        setToken(activeToken);
        res = await authApi.getMe();
      }
      const userData = res?.user || res?.data;
      if (!res?.success || !userData) throw new Error("Session user could not be restored");
      setUser(userData);
      if (userData.employee?.id) {
        void registerWebDevice();
      }
    } catch {
      if (operation !== authOperationRef.current) return;
      setSessionAccessToken(null);
      delete api.defaults.headers.common.Authorization;
      localStorage.removeItem("workpulse_access_token");
      localStorage.removeItem("workpulse_refresh_token");
      localStorage.removeItem("workpulse_user");
      localStorage.removeItem("workpulse_session_started_at");
      setUser(null);
      setToken(null);
    } finally {
      // Hydration is a one-time lifecycle flag. Even if a login/logout
      // superseded this request, the app must not remain in pre-hydration mode.
      markSessionHydrated();
      if (operation !== authOperationRef.current) return;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => loadUser());
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    const onBilling = () => {
      void loadUser();
    };
    window.addEventListener("workpulse:unauthorized", onUnauthorized);
    window.addEventListener("workpulse:billing", onBilling);
    return () => {
      window.removeEventListener("workpulse:unauthorized", onUnauthorized);
      window.removeEventListener("workpulse:billing", onBilling);
    };
  }, []);

  /** Everything that happens once credentials (and any second factor) are accepted. */
  const finishLogin = (loggedUser: User, receivedToken: string) => {
    setSessionAccessToken(receivedToken);
    setToken(receivedToken);
    localStorage.setItem("workpulse_session_started_at", String(Date.now()));
    setUser(loggedUser);
    if (loggedUser.employee?.id) {
      void registerWebDevice();
    }
    toast.success(`Welcome back, ${loggedUser.employee?.firstName || loggedUser.email}!`);

    if (loggedUser.mustChangePassword) {
      toast.info("Please set a new secure password to activate your account.");
      go("/change-password");
    } else {
      go(loggedUser.role === "SUPER_ADMIN" ? "/platform/clients" : "/dashboard");
    }
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    authOperationRef.current += 1;
    setIsLoading(true);
    try {
      const res = await authApi.login(email, pass);
      if (res?.success && res?.data?.twoFactorRequired && res?.data?.challengeToken) {
        sessionStorage.setItem("workpulse_2fa_challenge", res.data.challengeToken);
        go("/two-factor");
        return false;
      }
      if (res?.success && (res?.data?.accessToken || res?.data?.token)) {
        finishLogin(res.data.user, res.data.accessToken || res.data.token);
        return true;
      } else {
        toast.error(res?.message || "Login failed");
        return false;
      }
    } catch (error: unknown) {
      if (axios.isAxiosError<{ code?: string }>(error) && error.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        toast.info("Please verify your email to continue. Enter the code we sent you.");
        go(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}&resend=1`);
        return false;
      }
      toast.error(getErrorMessage(error, "Failed to log in"));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const completeTwoFactorLogin = async (code: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const challengeToken = sessionStorage.getItem("workpulse_2fa_challenge");
      if (!challengeToken) throw new Error("Your sign-in challenge has expired. Please sign in again.");
      const res = await authApi.verifyTwoFactorLogin(challengeToken, code);
      const receivedToken = res?.data?.accessToken || res?.data?.token;
      if (!res?.success || !receivedToken) throw new Error(res?.message || "Two-step verification failed");
      sessionStorage.removeItem("workpulse_2fa_challenge");
      finishLogin(res.data.user, receivedToken);
      return true;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Two-step verification failed"));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (email: string, code: string, checkoutPlan?: string | null): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await authApi.verifyEmail(email, code);
      const receivedToken = res?.data?.accessToken || res?.data?.token;
      if (res?.success && receivedToken) {
        setSessionAccessToken(receivedToken);
        setToken(receivedToken);
        setUser(res.data.user);
        if (res.data.user?.employee?.id) {
          void registerWebDevice();
        }
        if (checkoutPlan && checkoutPlan !== "FREE_TRIAL") {
          toast.success("Email verified! Complete checkout to activate the paid plan.");
          go(`/settings?checkout=${encodeURIComponent(checkoutPlan)}`);
        } else if (res.data.user?.planLocked) {
          toast.success("Email verified! Check your email for your Plan Unlock Code.", { duration: 6000 });
          go("/dashboard");
        } else {
          toast.success("Email verified! Welcome to WorkPulse.");
          go("/dashboard");
        }
        return true;
      }
      toast.error(res?.message || "Verification failed");
      return false;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Verification failed"));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await authApi.loginWithGoogle(idToken);
      if (res?.success && (res?.data?.accessToken || res?.data?.token)) {
        const receivedToken = res.data.accessToken || res.data.token;
        const loggedUser = res.data.user;

        setSessionAccessToken(receivedToken);
        setToken(receivedToken);
        setUser(loggedUser);
        if (loggedUser.employee?.id) {
          void registerWebDevice();
        }
        toast.success(`Welcome back, ${loggedUser.employee?.firstName || loggedUser.email}!`);
        go(loggedUser.role === "SUPER_ADMIN" ? "/platform/clients" : "/dashboard");
        return true;
      }
      toast.error(res?.message || "Google sign-in failed");
      return false;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Google sign-in failed"));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegistrationPayload): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await authApi.register(payload);
      if (res?.success && res.data?.requiresVerification) {
        toast.success("Account created! Enter the verification code we emailed you.", { duration: 6000 });
        const checkout =
          res.data.requiresCheckout && res.data.selectedPlan && res.data.selectedPlan !== "FREE_TRIAL"
            ? `&checkout=${encodeURIComponent(res.data.selectedPlan)}`
            : "";
        go(`/verify-email?email=${encodeURIComponent(res.data.email)}${checkout}`);
        return true;
      }
      if (res?.success) {
        const receivedToken = res.data?.accessToken || res.data?.token;
        const newUser = res.data?.user;

        if (receivedToken) {
          setSessionAccessToken(receivedToken);
          setToken(receivedToken);
          setUser(newUser);
        }

        if (res.data?.requiresCheckout && res.data?.selectedPlan && res.data.selectedPlan !== "FREE_TRIAL") {
          toast.success("Workspace created on a 14-day trial. Complete checkout to activate the paid plan.");
          go(`/settings?checkout=${encodeURIComponent(res.data.selectedPlan)}`);
        } else if (newUser?.planLocked) {
          toast.success("Organization created! Check your email for your Plan Unlock Code.", { duration: 6000 });
          go("/dashboard");
        } else {
          toast.success("Organization & Account registered successfully!");
          go("/dashboard");
        }
        return true;
      }
      return false;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Registration failed"));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    authOperationRef.current += 1;
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("workpulse_access_token");
      localStorage.removeItem("workpulse_refresh_token");
      localStorage.removeItem("workpulse_user");
      localStorage.removeItem("workpulse_session_started_at");
      setSessionAccessToken(null);
      setUser(null);
      setToken(null);
      toast.info("Logged out successfully");
      go("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isLoading,
        login,
        completeTwoFactorLogin,
        loginWithGoogle,
        register,
        verifyEmail,
        logout,
        refreshUser: () => loadUser(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
