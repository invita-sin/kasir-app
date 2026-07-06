"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiGet } from "@/lib/api-client";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<AuthUser>("/api/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const clearAuth = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, loading, setAuth: setUser, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
