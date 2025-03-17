"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import CartSidebar from "@/components/CartSidebar";
import { FiShoppingCart, FiUser, FiMenu, FiX } from "react-icons/fi";

export default function Navbar() {
  const { cart, isCartOpen, setCartOpen } = useCart();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
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

        {/* 🔹 Search Bar */}
        <div className="hidden md:block">
          <input
            type="text"
            placeholder="Search..."
            className="border px-3 py-1 rounded-md"
          />
        </div>

        {/* 🔹 Icons & User Menu */}
        <div className="flex items-center gap-4">
          {/* Cart Button - Opens Sidebar */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center"
            aria-label="Open Cart"
          >
            <FiShoppingCart size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                {cart.length}
              </span>
            )}
          </button>

          {/* User Account Dropdown */}
          {user ? (
            <div className="relative">
              <button
                className="flex items-center gap-1 hover:text-blue-600"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="User Menu"
              >
                <FiUser size={20} />
                {user.email}
              </button>
              {isMobileMenuOpen && (
                <div className="absolute right-0 mt-2 bg-white shadow-md p-2 rounded-md">
                  <button
                    onClick={logout}
                    className="text-red-500 hover:underline"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hover:text-blue-600">
              🔑 Login
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </nav>

      {/* 🔹 Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-md p-4 absolute top-16 left-0 w-full">
          <Link href="/products" className="block py-2 hover:text-blue-600">
            Products
          </Link>
          <Link href="/about" className="block py-2 hover:text-blue-600">
            About Us
          </Link>
          <Link href="/contact" className="block py-2 hover:text-blue-600">
            Contact
          </Link>
        </div>
      )}

      {/* 🔹 Cart Sidebar */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
