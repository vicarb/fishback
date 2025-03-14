"use client";
import { useState, useEffect } from "react";

type CartItem = {
  ID: number;
  name: string;
  price: number;
  stock?: number;
  quantity: number;
};

export default function CartSidebar({
  isOpen,
  onClose,
  setCart,
}: {
  isOpen: boolean;
  onClose: () => void;
  setCart: (cart: CartItem[]) => void;
}) {
  const [cart, updateCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    updateCart(storedCart);
  }, [isOpen]);

  function updateQuantity(ID: number, newQuantity: number) {
    if (newQuantity < 1) return;
    const updatedCart = cart.map((item) =>
      item.ID === ID ? { ...item, quantity: newQuantity } : item
    );
    updateCart(updatedCart);
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  }

  function removeItem(ID: number) {
    const updatedCart = cart.filter((item) => item.ID !== ID);
    updateCart(updatedCart);
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  }

  function getTotalPrice() {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
  }

  function checkout() {
    alert("Proceeding to checkout...");
  }

  // ✅ Close sidebar when clicking outside
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).id === "cart-overlay") {
      onClose();
    }
  }

  return (
    <div
      id="cart-overlay"
      className={`fixed inset-0 transition-opacity backdrop-blur-lg ${
        isOpen ? "visible opacity-100" : "invisible opacity-0"
      }`}
      onClick={handleOverlayClick}
    >
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-lg transform transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">Cart</h2>
          <button onClick={onClose} className="text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {cart.length === 0 ? (
            <p className="text-gray-500">Your cart is empty</p>
          ) : (
            cart.map((item) => (
              <div key={item.ID} className="flex justify-between items-center border-b py-2">
                <div>
                  <h3 className="font-bold">{item.name}</h3>
                  <p>${item.price.toFixed(2)}</p>
                  <div className="flex items-center mt-1">
                    <button onClick={() => updateQuantity(item.ID, item.quantity - 1)} className="px-2 py-1 border">-</button>
                    <span className="px-3">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.ID, item.quantity + 1)} className="px-2 py-1 border">+</button>
                  </div>
                </div>
                <button onClick={() => removeItem(item.ID)} className="text-red-500">Remove</button>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-4 border-t">
            <p className="text-lg font-bold">Total: ${getTotalPrice()}</p>
            <button
              onClick={checkout}
              className="w-full bg-blue-500 text-white py-2 rounded mt-2"
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
