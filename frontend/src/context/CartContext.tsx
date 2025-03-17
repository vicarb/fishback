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
  isCartOpen: boolean;
  setCartOpen: (state: boolean) => void;
  addToCart: (product: CartItem) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  updateCartQuantity: (id: number, quantity: number) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // ✅ Fix hydration issue

  useEffect(() => {
    setIsMounted(true);
    const storedCart = localStorage.getItem("cart");
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

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

    setCartOpen(true); // ✅ Ensure cart opens when an item is added
  }

  function removeFromCart(id: number) {
    setCart((prev) => prev.filter((item) => item.ID !== id));
  }

  function updateCartQuantity(productId: number, quantity: number) {
    setCart((prev) =>
      prev.map((item) => (item.ID === productId ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <CartContext.Provider
      value={{ cart, isCartOpen, setCartOpen, addToCart, removeFromCart, clearCart, updateCartQuantity }}
    >
      {isMounted && children}
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
