"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setCookie, getCookie, deleteCookie } from "cookies-next";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = getCookie("token");

    if (!token) {
      console.warn("⚠️ No token found, skipping user fetch.");
      setIsLoading(false);
      return;
    }

    console.log("🚀 Token found in cookies, fetching user...");
    fetchUser(token);
  }, []);

  const fetchUser = async (token?: string) => {
    try {
      const userToken = token || getCookie("token");

      if (!userToken) {
        console.warn("⚠️ No token found, skipping fetchUser.");
        setIsLoading(false);
        return;
      }

      console.log("🚀 Fetching user with token:", userToken);

      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (!res.ok) {
        console.error("❌ Unauthorized, user not logged in.");
        setIsLoading(false);
        return; // Avoid immediate logout
      }

      const userData = await res.json();
      console.log("✅ User data received:", userData);
      setUser(userData);
      setIsLoading(false);
    } catch (error) {
      console.error("❌ Error fetching user:", error);
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("🚀 Attempting login...");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        console.error("❌ Login request failed:", await res.text());
        return false; // Return false if login fails
      }

      const { token } = await res.json();

      if (!token || token.split(".").length !== 3) {
        console.error("❌ Malformed token received:", token);
        return false;
      }

      console.log("✅ Login successful, setting token:", token);
      setCookie("token", token, { path: "/", secure: true, sameSite: "Strict" });

      await fetchUser(token);
      queryClient.invalidateQueries(["dashboardStats"]);

      return true; // Login successful
    } catch (error) {
      console.error("❌ Login error:", error);
      return false;
    }
  };

  const logout = () => {
    console.log("🔴 Logging out...");
    deleteCookie("token");
    setUser(null);
    queryClient.invalidateQueries(["dashboardStats"]);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}