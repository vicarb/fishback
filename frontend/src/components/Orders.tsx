"use client";
import { useState, useEffect } from "react";

type Order = {
  ID: number;
  Products: { ProductID: number; Quantity: number }[];
  Status: string;
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function fetchOrders() {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("http://localhost:8081/orders", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setOrders(await res.json());
      }
    }
    fetchOrders();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your Orders</h2>
      {orders.length === 0 ? <p>No orders found.</p> : (
        <div>
          {orders.map((order) => (
            <div key={order.ID} className="border p-2 rounded">
              <p>Order #{order.ID} - Status: {order.Status}</p>
              {order.Products.map((p, i) => (
                <p key={i}>Product ID: {p.ProductID}, Quantity: {p.Quantity}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
