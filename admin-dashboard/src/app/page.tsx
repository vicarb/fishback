"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext"; // Use Auth Context

// Fetch admin stats
const fetchDashboardStats = async () => {
  const res = await fetch("/api/admin/dashboard", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
};

export default function AdminHome() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push("/login"); // Redirect if not logged in
    } else if (user.role !== "admin") {
      router.push("/"); // Redirect if not an admin
    }
  }, [user, router]);

  const { data, error, isLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: fetchDashboardStats,
    enabled: !!user, // Wait until user data is loaded
  });

  if (!user) return <p>Checking authentication...</p>;
  if (user.role !== "admin") return <p>Access Denied</p>;

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">Error loading dashboard</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <DashboardCard title="Total Orders" value={data.orderCount} link="/orders" />
          <DashboardCard title="Pending Orders" value={data.pendingOrders} link="/orders" />
          <DashboardCard title="Total Products" value={data.productCount} link="/products" />
        </div>
      )}
    </main>
  );
}

// Reusable Dashboard Card Component
function DashboardCard({ title, value, link }: { title: string; value: number; link: string }) {
  return (
    <Link href={link} className="bg-white p-6 shadow-md rounded-lg hover:shadow-lg transition">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </Link>
  );
}