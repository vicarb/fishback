"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-6">
          <Link href="/orders" className="hover:text-blue-600">Orders</Link>
          <Link href="/products" className="hover:text-blue-600">Products</Link>
          <button onClick={logout} className="text-red-500">Logout</button>
        </div>
      </nav>

      {/* Page Content */}
      <div className="p-6">{children}</div>
    </main>
  );
}
