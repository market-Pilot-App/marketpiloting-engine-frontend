"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface AuthClient {
  client_id: number;
  campaign_id: number | null;
  plan: string;
  name: string;
  access_token: string;
  campaign_name?: string;
}

interface AuthContextType {
  client: AuthClient | null;
  loaded: boolean;
  isAdmin: boolean;
  isImpersonating: boolean;
  impersonatedName: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  startImpersonation: (clientId: number) => Promise<void>;
  endImpersonation: () => void;
  switchBrand: (campaignId: number, campaignName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<AuthClient | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("mp_client");
    if (stored) setClient(JSON.parse(stored));
    setIsImpersonating(!!localStorage.getItem("mp_admin_token"));
    setLoaded(true);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<AuthClient>("/auth/login", { email, password });
    localStorage.setItem("mp_token", data.access_token);
    localStorage.setItem("mp_client", JSON.stringify(data));
    setClient(data);
    router.push("/");
  };

  const logout = () => {
    localStorage.removeItem("mp_token");
    localStorage.removeItem("mp_client");
    localStorage.removeItem("mp_admin_token");
    localStorage.removeItem("mp_admin_client");
    setClient(null);
    setIsImpersonating(false);
    setImpersonatedName(null);
    router.push("/login");
  };

  const startImpersonation = async (clientId: number) => {
    // Save admin token before replacing
    const adminToken = localStorage.getItem("mp_token");
    const adminClient = localStorage.getItem("mp_client");
    localStorage.setItem("mp_admin_token", adminToken!);
    localStorage.setItem("mp_admin_client", adminClient!);

    const data = await api.post<AuthClient>(`/admin/impersonate/${clientId}`);
    localStorage.setItem("mp_token", data.access_token);
    localStorage.setItem("mp_client", JSON.stringify(data));
    setClient(data);
    setIsImpersonating(true);
    setImpersonatedName(data.name);
    router.push("/");
  };

  const endImpersonation = () => {
    const adminToken = localStorage.getItem("mp_admin_token");
    const adminClient = localStorage.getItem("mp_admin_client");
    if (!adminToken || !adminClient) return;

    // Log end on backend (fire and forget)
    if (client) {
      api.post(`/admin/impersonate/${client.client_id}/end`).catch(() => {});
    }

    localStorage.setItem("mp_token", adminToken);
    localStorage.setItem("mp_client", adminClient);
    localStorage.removeItem("mp_admin_token");
    localStorage.removeItem("mp_admin_client");

    setClient(JSON.parse(adminClient));
    setIsImpersonating(false);
    setImpersonatedName(null);
    router.push("/admin");
  };

  const switchBrand = async (campaignId: number, campaignName: string) => {
    const data = await api.post<AuthClient>(`/campaigns/${campaignId}/switch`);
    localStorage.setItem("mp_token", data.access_token);
    localStorage.setItem("mp_client", JSON.stringify(data));
    setClient(data);
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        client,
        loaded,
        isAdmin: client?.plan === "admin",
        isImpersonating,
        impersonatedName,
        login,
        logout,
        startImpersonation,
        endImpersonation,
        switchBrand,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
