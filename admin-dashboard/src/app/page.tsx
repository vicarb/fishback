"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminHome() {
  const [orderCount, setOrderCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        const orderRes = await fetch("http://localhost:8081/orders", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const productRes = await fetch("http://localhost:8083/products");

        if (orderRes.ok) {
          const orders = await orderRes.json();
          setOrderCount(orders.length);
          setPendingOrders(orders.filter((o: any) => o.Status === "PENDING").length);
        }

        if (productRes.ok) {
          const products = await productRes.json();
          setProductCount(products.length);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    }

    fetchDashboardStats();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <DashboardCard
          title="Total Orders"
          value={orderCount}
          link="/orders"
        />
        <DashboardCard
          title="Pending Orders"
          value={pendingOrders}
          link="/orders"
        />
        <DashboardCard
          title="Total Products"
          value={productCount}
          link="/products"
        />
      </div>
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
