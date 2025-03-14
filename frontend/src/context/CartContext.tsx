"use client";
import { createContext, useContext, useState, useEffect } from "react";

type CartItem = {
  ID: number;
  name: string;
  price: number;
  stock?: number;
  quantity: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (product: CartItem) => void;
  updateQuantity: (ID: number, quantity: number) => void;
  removeFromCart: (ID: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(storedCart);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  function addToCart(product: CartItem) {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.ID === product.ID);
      if (existing) {
        return prevCart.map((item) =>
          item.ID === product.ID ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  }

  function updateQuantity(ID: number, quantity: number) {
    if (quantity < 1) return;
    setCart((prevCart) =>
      prevCart.map((item) => (item.ID === ID ? { ...item, quantity } : item))
    );
  }

  function removeFromCart(ID: number) {
    setCart((prevCart) => prevCart.filter((item) => item.ID !== ID));
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

// Custom hook to use CartContext
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
