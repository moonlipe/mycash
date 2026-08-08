import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, type User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, turnstileToken?: string) => Promise<string | null>;
  register: (email: string, password: string, turnstileToken?: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(({ data }) => {
        if (data?.user) setUser(data.user);
      })
      .catch((err) => {
        console.error("[AuthContext] failed to load session", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string, turnstileToken?: string) => {
    const { data, error } = await api.login(email, password, turnstileToken);
    if (error) return error;
    if (data?.user) setUser(data.user);
    return null;
  }, []);

  const register = useCallback(async (email: string, password: string, turnstileToken?: string) => {
    const { data, error } = await api.register(email, password, turnstileToken);
    if (error) return error;
    if (data?.user) setUser(data.user);
    return null;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
