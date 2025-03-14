"use client";
import { useState, useEffect } from "react";

export default function Cart({ isOpen, onClose }) {
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    const uniqueCart = storedCart.reduce((acc, item) => {
      const existingItem = acc.find((i) => i.ID === item.ID);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        acc.push({ ...item, quantity: 1 });
      }
      return acc;
    }, []);
    localStorage.setItem("cart", JSON.stringify(uniqueCart));
    setCart(uniqueCart);
    calculateTotal(uniqueCart);
  }, [isOpen]);

  function calculateTotal(cart) {
    const totalCost = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    setTotal(totalCost);
  }

  function updateQuantity(productId, quantity) {
    const updatedCart = cart.map((item) =>
      item.ID === productId ? { ...item, quantity: Math.max(1, quantity) } : item
    );
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setCart(updatedCart);
    calculateTotal(updatedCart);
  }

  function removeFromCart(productId) {
    const updatedCart = cart.filter((item) => item.ID !== productId);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setCart(updatedCart);
    calculateTotal(updatedCart);
  }

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-bold">Cart</h2>
        <button onClick={onClose} className="text-red-500">✕</button>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto h-[calc(100vh-120px)]">
        {cart.length === 0 ? (
          <p className="text-gray-500">Your cart is empty.</p>
        ) : (
          cart.map((item) => (
            <div key={`cart-item-${item.ID}`} className="flex justify-between items-center border-b pb-2">
              <div>
                <h3 className="font-bold">{item.name}</h3>
                <p>${item.price.toFixed(2)}</p>
                <p className="text-sm">Total: ${(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => updateQuantity(item.ID, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="px-2 bg-gray-300 rounded"
                >
                  -
                </button>
                <span className="mx-2">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.ID, item.quantity + 1)}
                  className="px-2 bg-gray-300 rounded"
                >
                  +
                </button>
                <button onClick={() => removeFromCart(item.ID)} className="ml-2 text-red-500">✕</button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t">
        <h3 className="text-lg font-bold">Total: ${total.toFixed(2)}</h3>
        <button className="w-full bg-blue-500 text-white py-2 mt-2 rounded">Checkout</button>
      </div>
    </div>
  );
}
