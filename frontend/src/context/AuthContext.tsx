import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { storage } from '@/src/utils/storage';
import { api, setAuthToken } from '@/src/api/client';

const TOKEN_KEY = 'sunsu_token';

export type AuthUser = {
  id: string;
  phone?: string;
  email?: string;
  name?: string;
  is_admin?: boolean;
};

type AuthCtx = {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  sendOtp: (phone: string) => Promise<{ dev_otp?: string; message: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await storage.secureGet<string>(TOKEN_KEY, '');
      if (stored) {
        setAuthToken(stored);
        setToken(stored);
        try {
          const me = await api.get<AuthUser>('/auth/me', true);
          setUser(me);
        } catch {
          setAuthToken(null);
          await storage.secureRemove(TOKEN_KEY);
          setToken(null);
        }
      }
      setReady(true);
    })();
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    return api.post('/auth/send-otp', { phone });
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/verify-otp', { phone, otp });
    setAuthToken(res.token);
    await storage.secureSet(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await storage.secureRemove(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: { name?: string; email?: string }) => {
    const updated = await api.put<AuthUser>('/auth/profile', data, true);
    setUser(updated);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get<AuthUser>('/auth/me', true);
      setUser(me);
    } catch {}
  }, []);

  return (
    <Ctx.Provider value={{ user, token, ready, sendOtp, verifyOtp, logout, updateProfile, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}
