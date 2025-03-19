"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("🚀 Logging in with:", email, password);
      
      const success = await login(email, password);
      
      if (success) {
        console.log("✅ Login successful! Redirecting...");
        router.push("/admin"); // Redirect to admin dashboard
      } else {
        console.error("❌ Login failed");
        alert("Invalid credentials");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      alert("Login failed");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border mb-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border mb-4"
          required
        />
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Login</button>
      </form>
    </main>
  );
}
