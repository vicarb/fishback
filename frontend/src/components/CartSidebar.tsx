"use client";
import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { cart, removeFromCart, updateCartQuantity } = useCart();
  const [stockData, setStockData] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    async function fetchStock() {
      const stockInfo: { [key: number]: number } = {};
      for (const item of cart) {
        try {
          const res = await fetch(`http://localhost:8082/inventory?product_id=${item.ID}`);
          const stockText = await res.text();
          const stock = parseInt(stockText.replace("Stock disponible: ", ""), 10);
          stockInfo[item.ID] = stock;
        } catch (error) {
          console.error(`Error fetching stock for product ${item.ID}:`, error);
          stockInfo[item.ID] = 0; // Assume unavailable if fetch fails
        }
      }
      setStockData(stockInfo);
    }

    if (cart.length > 0) {
      fetchStock();
    }
  }, [cart]);

  // Calculate total cost
  const totalCost = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-white shadow-lg transform ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } transition-transform duration-300 ease-in-out p-4`}
    >
      <button onClick={onClose} className="mb-4 text-gray-600">✖ Close</button>
      <h2 className="text-lg font-bold">Shopping Cart</h2>

      <div className="mt-4">
        {cart.length === 0 ? (
          <p>Your cart is empty</p>
        ) : (
          cart.map((item) => (
            <div key={item.ID} className="flex justify-between items-center mb-2 border-b pb-2">
              <div>
                <span className="font-semibold">{item.name}</span>
                <p className="text-gray-500 text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                <p className="text-xs text-gray-400">
                  Stock: {stockData[item.ID] !== undefined ? stockData[item.ID] : "Loading..."}
                </p>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => updateCartQuantity(item.ID, Math.max(1, item.quantity - 1))}
                  className="px-2 py-1 bg-gray-300 rounded"
                >
                  -
                </button>
                <span className="px-2">{item.quantity}</span>
                <button
                  onClick={() => {
                    if (stockData[item.ID] !== undefined && item.quantity < stockData[item.ID]) {
                      updateCartQuantity(item.ID, item.quantity + 1);
                    }
                  }}
                  disabled={stockData[item.ID] !== undefined && item.quantity >= stockData[item.ID]}
                  className={`px-2 py-1 rounded ${
                    stockData[item.ID] !== undefined && item.quantity >= stockData[item.ID]
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-gray-300"
                  }`}
                >
                  +
                </button>
              </div>
              <button onClick={() => removeFromCart(item.ID)} className="text-red-500 text-sm">
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Total and Checkout */}
      {cart.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-lg font-semibold">Total: ${totalCost.toFixed(2)}</h3>
          <button
            className="w-full bg-green-500 text-white py-2 mt-4 rounded"
            onClick={() => alert("Proceeding to checkout...")}
          >
            Checkout
          </button>
        </div>
      )}
    </div>
  );
}
