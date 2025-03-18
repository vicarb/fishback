"use client";
import { useEffect, useState } from "react";

type Order = {
  ID: number;
  Email: string;
  Products: { ProductID: number; Quantity: number }[];
  Status: string;
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function fetchOrders() {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("http://localhost:8081/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setOrders(await res.json());
      }
    }
    fetchOrders();
  }, []);

  async function confirmOrder(id: number) {
    await fetch(`http://localhost:8081/orders/confirm`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ order_id: id }),
    });
    alert(`Order ${id} confirmed.`);
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6">Manage Orders</h1>
      {orders.length === 0 ? <p>No orders available.</p> : orders.map((order) => (
        <div key={order.ID} className="bg-white p-4 shadow-md rounded-md mb-4">
          <p><strong>Order #{order.ID}</strong> - {order.Status}</p>
          <p>Email: {order.Email}</p>
          <button onClick={() => confirmOrder(order.ID)} className="bg-blue-500 text-white px-3 py-1 rounded mt-2">
            Confirm Order
          </button>
        </div>
      ))}
    </main>
  );
}
