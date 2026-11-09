import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "../lib/api.js";
import type { Role, Permission } from "@travel-agency/shared";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone?: string;
  branchId?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  permissions: Permission[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await apiClient<{ success: boolean; user: AuthUser; permissions: Permission[] }>("/auth/me");
      if (res.success && res.user) {
        setUser(res.user);
        setPermissions(res.permissions || []);
      } else {
        setUser(null);
        setPermissions([]);
      }
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleSessionExpired = () => {
      setUser(null);
      setPermissions([]);
    };

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient<{
        success: boolean;
        user: AuthUser;
        permissions: Permission[];
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.success && res.user) {
        setUser(res.user);
        setPermissions(res.permissions || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } catch {
      // Continue clearing client state even if network fails
    } finally {
      setUser(null);
      setPermissions([]);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isLoading,
        login,
        logout,
        hasPermission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

