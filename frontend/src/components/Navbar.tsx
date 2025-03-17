"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { cart } = useCart();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      {/* 🔹 Logo */}
      <h1 className="text-2xl font-bold">
        <Link href="/">My E-commerce</Link>
      </h1>

      {/* 🔹 Desktop Navigation */}
      <div className="hidden md:flex gap-6">
        <Link href="/products" className="hover:text-blue-600">
          Products
        </Link>
        <Link href="/about" className="hover:text-blue-600">
          About Us
        </Link>
        <Link href="/contact" className="hover:text-blue-600">
          Contact
        </Link>
      </div>

      {/* 🔹 Search Bar (Placeholder) */}
      <div className="hidden md:block">
        <input
          type="text"
          placeholder="Search..."
          className="border px-3 py-1 rounded-md"
        />
      </div>

      {/* 🔹 Icons */}
      <div className="flex items-center gap-4">
        {/* Cart Button */}
        <Link href="/cart" className="relative">
          🛒 <span className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
            {cart.length}
          </span>
        </Link>

        {/* Auth Links */}
        {user ? (
          <div className="relative">
            <button className="hover:text-blue-600" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              👤 {user.email}
            </button>
            {isMobileMenuOpen && (
              <div className="absolute right-0 mt-2 bg-white shadow-md p-2 rounded-md">
                <button onClick={logout} className="text-red-500">Logout</button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="hover:text-blue-600">
            🔑 Login
          </Link>
        )}
      </div>
    </nav>
  );
}
