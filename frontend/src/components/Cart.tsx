"use client";
import { useState, useEffect } from "react";

type Product = {
  ID: number;
  name: string;
  price: number;
  quantity: number;
};

export default function Cart() {
  const [cart, setCart] = useState<Product[]>([]);

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(storedCart);
  }, []);

  async function checkout() {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to checkout.");
      return;
    }

    const res = await fetch("http://localhost:8081/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        products: cart.map((p) => ({ product_id: p.ID, quantity: p.quantity })),
      }),
    });

    if (res.ok) {
      alert("Order placed successfully!");
      localStorage.removeItem("cart");
      setCart([]);
    } else {
      alert("Error placing order.");
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Cart</h2>
      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div>
          {cart.map((product, index) => (
            <div key={index} className="border p-2 rounded">
              <p>{product.name} - {product.quantity} x ${product.price.toFixed(2)}</p>
            </div>
          ))}
          <button onClick={checkout} className="mt-4 bg-green-500 text-white px-3 py-1 rounded">
            Checkout
          </button>
        </div>
      )}
    </div>
  );
}
