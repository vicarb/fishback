"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(""); // Reset message

    const loginData = {
      email,
      password,
    };

    try {
      const response = await fetch("http://localhost:8084/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      if (!response.ok) {
        setMessage("❌ Credenciales inválidas");
        return;
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);

      setMessage("✅ Inicio de sesión exitoso");
      setTimeout(() => {
        router.push("/admin/products"); // Redirect to product management page
      }, 1000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error en la conexión con el servidor");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4 text-center">Admin Login</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Correo Electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
          >
            Iniciar Sesión
          </button>
        </form>

        {message && <p className="text-center mt-4 font-semibold">{message}</p>}
      </div>
    </main>
  );
}
