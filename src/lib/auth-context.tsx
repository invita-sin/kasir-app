"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiGet } from "@/lib/api-client";

const STORAGE_KEY = "kasir_auth_user";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  cabangId?: string | null;
  cabang?: { name: string; appName: string; address?: string; phone?: string } | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  setAuth: (user: AuthUser) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setAuth: () => {},
  clearAuth: () => {},
});

function saveUser(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...user, _cachedAt: Date.now() }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) { console.error("[AuthContext] saveUser error:", e); }
}

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const { _cachedAt, ...user } = parsed;
    return user as AuthUser;
  } catch (e) {
    console.error("[AuthContext] loadUser error:", e);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiGet<AuthUser>("/api/auth/me")
      .then((u) => {
        if (cancelled) return;
        saveUser(u);
        setUser(u);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[AuthContext] fetch user failed:", e);
        const cached = loadUser();
        setUser(cached);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const clearAuth = useCallback(() => {
    saveUser(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setAuth: (u) => { saveUser(u); setUser(u); }, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
