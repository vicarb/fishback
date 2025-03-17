"use client";
import { useState, useEffect } from "react";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    async function fetchOrders() {
      const res = await fetch("http://localhost:8081/orders", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
    <div className="min-h-screen p-6 bg-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-center">Administrar Pedidos</h2>

      {orders.map((order) => (
        <div key={order.ID} className="bg-white p-4 shadow-md rounded-md mt-4 flex justify-between">
          <span>Pedido #{order.ID} - Estado: {order.Status}</span>
          <button onClick={() => confirmOrder(order.ID)} className="bg-blue-500 text-white px-3 py-1 rounded-md">Confirmar</button>
        </div>
      ))}
    </div>
  );
}
