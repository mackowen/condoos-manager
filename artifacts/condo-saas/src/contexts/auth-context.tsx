import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Condominium } from "@workspace/api-client-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  condominium: Condominium | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User, condominium: Condominium) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("condo_token"));
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: meData, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    }
  });

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError]);

  const login = (newToken: string, user: User, condominium: Condominium) => {
    localStorage.setItem("condo_token", newToken);
    setToken(newToken);
    // Optimistically set me data
    queryClient.setQueryData(getGetMeQueryKey(), { user, condominium, permissions: [] });
  };

  const logout = () => {
    localStorage.removeItem("condo_token");
    setToken(null);
    queryClient.clear();
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user: meData?.user ?? null,
        condominium: meData?.condominium ?? null,
        permissions: meData?.permissions ?? [],
        isAuthenticated: !!meData?.user,
        isLoading: !!token && isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}