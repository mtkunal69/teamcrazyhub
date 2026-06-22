import { createContext, useContext, useEffect, useState } from "react";
import { api, getSession, setSession, clearSession } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      setReady(true);
      return;
    }
    api.get("/auth/me").then(() => setReady(true)).catch(() => {
      clearSession();
      setUser(null);
      setReady(true);
    });
  }, []);

  const loginAdmin = async (username, password) => {
    const { data } = await api.post("/auth/admin/login", { username, password });
    setSession(data);
    setUser(data);
    return data;
  };

  const loginUser = async (name, telegram) => {
    const { data } = await api.post("/auth/user/login", { name, telegram });
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
