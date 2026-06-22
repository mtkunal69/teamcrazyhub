import { createContext, useContext, useEffect, useState } from "react";
import { getSession, setSession, clearSession, api } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession());
  // Trust localStorage on mount — no /auth/me round-trip required.
  // Individual protected requests will fail with 401 if token is bad,
  // and clear the session at that point (handled in api.js interceptor).
  const [ready] = useState(true);

  // Listen for "auth:logout" event from interceptor (cross-component logout)
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const loginAdmin = async (username, password) => {
    const { data } = await api.post("/auth/admin/login", { username, password });
    setSession(data);
    setUser(data);
    return data;
  };

  const loginUser = async (username, password) => {
    const { data } = await api.post("/auth/user/login", { username, password });
    setSession(data);
    setUser(data);
    return data;
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, ready, loginAdmin, loginUser, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
