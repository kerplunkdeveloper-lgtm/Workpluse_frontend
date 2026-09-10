'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { User, ApiResponse } from '@/types/auth';

interface RegisterData {
  email: string;
  password: string;
  organizationName?: string;
  organizationId?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const storedToken = localStorage.getItem('workpulse_token');
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      const res = await api.get<ApiResponse<User>>('/auth/me');
      if (res.data?.success && res.data.data) {
        setUser(res.data.data);
        localStorage.setItem('workpulse_user', JSON.stringify(res.data.data));
      }
    } catch {
      localStorage.removeItem('workpulse_token');
      localStorage.removeItem('workpulse_user');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('workpulse_token');
    const storedUser = localStorage.getItem('workpulse_user');

    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // ignore corrupted json
        }
      }
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success && res.data.data) {
      const newToken = res.data.data.accessToken || res.data.data.token;
      const newUser = res.data.data.user;
      localStorage.setItem('workpulse_token', newToken);
      localStorage.setItem('workpulse_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } else {
      throw new Error(res.data?.message || 'Login failed');
    }
  };

  const register = async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    if (res.data?.success && res.data.data) {
      const newToken = res.data.data.accessToken || res.data.data.token;
      const newUser = res.data.data.user;
      localStorage.setItem('workpulse_token', newToken);
      localStorage.setItem('workpulse_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } else {
      throw new Error(res.data?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network errors during logout
    } finally {
      localStorage.removeItem('workpulse_token');
      localStorage.removeItem('workpulse_user');
      setUser(null);
      setToken(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
