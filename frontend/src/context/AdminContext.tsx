import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '@/src/utils/storage';
import { adminApi, setAdminToken } from '@/src/api/admin';

const KEY = 'sunsu_admin_token';

type AdminUser = { id: string; email?: string; name?: string };

type AdminCtx = {
  token: string | null;
  admin: AdminUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AdminCtx>({} as AdminCtx);
export const useAdmin = () => useContext(Ctx);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await storage.getItem<string>(KEY, '');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setAdminToken(parsed.token);
          setToken(parsed.token);
          setAdmin(parsed.admin);
        } catch {}
      }
      setReady(true);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await adminApi.post<{ token: string; user: AdminUser }>('/auth/admin/login', { email, password });
    setAdminToken(res.token);
    setToken(res.token);
    setAdmin(res.user);
    await storage.setItem(KEY, JSON.stringify({ token: res.token, admin: res.user }));
  };

  const logout = async () => {
    setAdminToken(null);
    setToken(null);
    setAdmin(null);
    await storage.removeItem(KEY);
  };

  return <Ctx.Provider value={{ token, admin, ready, login, logout }}>{children}</Ctx.Provider>;
}
