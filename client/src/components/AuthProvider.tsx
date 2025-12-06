import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface AuthContextValue {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: any;
}) {
  const [user, setUser] = useState(initialUser);
  const isAuthenticated = !!user;

  // Keep provider state in sync with react-query's /api/user cache so
  // mutations that update the cache (login/register) reflect immediately.
  const { data: queriedUser } = useQuery({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    // Use the initialUser as initialData so hydration works
    initialData: initialUser ?? undefined,
    // Don't refetch on mount since SSR should have prefetched; rely on cache
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (queriedUser !== undefined) {
      setUser(queriedUser);
    }
  }, [queriedUser]);

  // Optional debug log (you can remove this)
  useEffect(() => {
    console.log("[AuthProvider] hydrated user:", user);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}