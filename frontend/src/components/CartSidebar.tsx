"use client";
import { useCart } from "@/context/CartContext";
import { useState, useEffect } from "react";

export default function CartSidebar() {
  const { cart, removeFromCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  function toggleSidebar() {
    setIsOpen(!isOpen);
  }

  return (
    <>
      {/* Button to open sidebar */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Cart ({isMounted ? cart.length : 0})
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300 ease-in-out`}
      >
        <button onClick={toggleSidebar} className="m-4 text-gray-600">
          ✖ Close
        </button>
        <h2 className="text-lg font-bold p-4">Shopping Cart</h2>
        <div className="p-4">
          {cart.length === 0 ? (
            <p>Your cart is empty</p>
          ) : (
            cart.map((item) => (
              <div key={item.ID} className="flex justify-between items-center mb-2">
                <span>{item.name} x{item.quantity}</span>
                <button
                  onClick={() => removeFromCart(item.ID)}
                  className="text-red-500 text-sm"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
