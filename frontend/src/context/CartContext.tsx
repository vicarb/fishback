"use client";
import { createContext, useContext, useState, useEffect } from "react";

type CartItem = {
  ID: number;
  name: string;
  price: number;
  quantity: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (product: CartItem) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState(false); // ✅ Fix hydration issue

  // Load cart from localStorage after mounting
  useEffect(() => {
    setIsMounted(true);
    const storedCart = localStorage.getItem("cart");
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart, isMounted]);

  function addToCart(product: CartItem) {
    setCart((prev) => {
      const existingItem = prev.find((item) => item.ID === product.ID);
      if (existingItem) {
        return prev.map((item) =>
          item.ID === product.ID ? { ...item, quantity: item.quantity + product.quantity } : item
        );
      } else {
        return [...prev, product];
      }
    });
  }

  function removeFromCart(id: number) {
    setCart((prev) => prev.filter((item) => item.ID !== id));
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {isMounted && children} {/* ✅ Prevents hydration mismatch */}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
