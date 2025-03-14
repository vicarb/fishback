"use client";
import { useState, useEffect } from "react";

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
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Admin Orders</h2>
      {orders.map((order) => (
        <div key={order.ID} className="border p-2 rounded">
          <p>Order #{order.ID} - Status: {order.Status}</p>
          <button onClick={() => confirmOrder(order.ID)} className="bg-blue-500 text-white px-2 py-1">
            Confirm
          </button>
        </div>
      ))}
    </div>
  );
}
