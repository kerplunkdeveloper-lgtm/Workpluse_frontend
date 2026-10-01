"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, UserRole } from "@/types";
import {
  authApi,
  api,
  getSessionAccessToken,
  registerWebDevice,
  setSessionAccessToken,
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
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  register: (payload: RegistrationPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const go = (path: string) => {
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      router.replace(path);
    }, 0);
  };

  const loadUser = async (authToken?: string) => {
    try {
      let activeToken = authToken || getSessionAccessToken();
      if (!activeToken) return;
      setSessionAccessToken(activeToken);
      setToken(activeToken);
      const res = await authApi.getMe();
      const userData = res?.user || res?.data;
      if (res?.success && userData) {
        setUser(userData);
        if (userData.employee?.id) {
          void registerWebDevice();
        }
      }
    } catch {
      setSessionAccessToken(null);
      delete api.defaults.headers.common.Authorization;
      localStorage.removeItem("workpulse_access_token");
      localStorage.removeItem("workpulse_refresh_token");
      localStorage.removeItem("workpulse_user");
      setUser(null);
      setToken(null);
    } finally {
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

  const login = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, pass);
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

        if (loggedUser.mustChangePassword) {
          toast.info("Please set a new secure password to activate your account.");
          go("/change-password");
        } else {
          go("/dashboard");
        }
        return true;
      } else {
        toast.error(res?.message || "Login failed");
        return false;
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to log in"));
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
        go("/dashboard");
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
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("workpulse_access_token");
      localStorage.removeItem("workpulse_refresh_token");
      localStorage.removeItem("workpulse_user");
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
        loginWithGoogle,
        register,
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
