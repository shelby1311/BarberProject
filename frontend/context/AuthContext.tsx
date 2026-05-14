"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Barber, AuthUser } from "@/types";

interface AuthContextType {
  user: AuthUser | null;
  barber: Barber | null;
  role: "client" | "barber" | null;
  token: string | null;
  login: (token: string, role: "client" | "barber", user: AuthUser, barber: Barber | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [role, setRole] = useState<"client" | "barber" | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const t = localStorage.getItem("bf_token");
      const u = localStorage.getItem("bf_user");
      const b = localStorage.getItem("bf_barber");
      const r = localStorage.getItem("bf_role") as "client" | "barber" | null;
      if (t && u) {
        setToken(t);
        setUser(JSON.parse(u));
        setRole(r);
        if (b) setBarber(JSON.parse(b));
      }
    } catch {
      // localStorage indisponível ou JSON inválido
    } finally {
      setIsLoading(false);
    }
  }, []);

  function login(t: string, r: "client" | "barber", u: AuthUser, b: Barber | null) {
    localStorage.setItem("bf_token", t);
    localStorage.setItem("bf_user", JSON.stringify(u));
    localStorage.setItem("bf_role", r);
    if (b) localStorage.setItem("bf_barber", JSON.stringify(b));
    setToken(t);
    setUser(u);
    setRole(r);
    setBarber(b);
  }

  function logout() {
    ["bf_token", "bf_user", "bf_barber", "bf_role"].forEach((k) => localStorage.removeItem(k));
    setToken(null);
    setUser(null);
    setBarber(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ user, barber, role, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
