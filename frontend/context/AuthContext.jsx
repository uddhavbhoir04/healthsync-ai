"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { authService } from "@/services/auth.service";
import { getAccessToken, setAccessToken, clearAccessToken, setOnAuthFailure } from "@/lib/api";
import { useRouter } from "next/navigation";

const AuthContext = createContext({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const refreshPromiseRef = useRef(null);

  // Set auth failure hook from API client
  useEffect(() => {
    setOnAuthFailure(() => {
      setUser(null);
      setToken(null);
      setIsLoading(false);
    });
  }, []);

  /**
   * Refreshes the session using the httpOnly cookie and gets fresh access token + user details
   */
  const refreshSession = useCallback(() => {
    // Share a single in-flight refresh: concurrent callers (e.g. StrictMode's
    // double-mounted effect) must await the same request, otherwise one caller
    // resolves early with no user and the refresh-token rotation can race.
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        // Call backend refresh endpoint
        const refreshRes = await authService.refresh();
        if (refreshRes?.accessToken) {
          setToken(refreshRes.accessToken);

          // If backend returned user object directly
          if (refreshRes.user) {
            setUser(refreshRes.user);
            return { user: refreshRes.user, token: refreshRes.accessToken };
          }

          // Otherwise fetch fresh user profile
          try {
            const meRes = await authService.getMe();
            if (meRes?.user) {
              setUser(meRes.user);
              return { user: meRes.user, token: refreshRes.accessToken };
            }
          } catch {
            return { token: refreshRes.accessToken };
          }
        }
        return null;
      } catch {
        clearAccessToken();
        setUser(null);
        setToken(null);
        return null;
      } finally {
        refreshPromiseRef.current = null;
        setIsLoading(false);
      }
    })();

    return refreshPromiseRef.current;
  }, []);

  // Hydrate session on app mount
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  /**
   * Login handler
   */
  const login = useCallback(async (email, password) => {
    const data = await authService.login({ email, password });
    if (data?.accessToken && data?.user) {
      setToken(data.accessToken);
      setUser(data.user);
      return data;
    }
    throw new Error(data?.message || "Login failed");
  }, []);

  /**
   * Registration handler
   */
  const register = useCallback(async (name, email, password) => {
    const data = await authService.register({ name, email, password });
    return data;
  }, []);

  /**
   * Logout handler
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Continue cleanup even if server logout errored
    } finally {
      clearAccessToken();
      setUser(null);
      setToken(null);
      router.push("/login");
    }
  }, [router]);

  const updateUserData = useCallback((newData) => {
    setUser((prev) => (prev ? { ...prev, ...newData } : prev));
  }, []);

  const value = {
    user,
    accessToken: token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    refreshSession,
    updateUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
