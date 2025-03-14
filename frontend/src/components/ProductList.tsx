"use client";
import { useState, useEffect } from "react";
import CartSidebar from "./CartSidebar";

type Product = {
  ID: number;
  name: string;
  price: number;
  stock?: number;
};

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      const res = await fetch("http://localhost:8083/products");
      const data = await res.json();
      const updatedProducts = await Promise.all(
        data.map(async (product: Product) => {
          const stockRes = await fetch(`http://localhost:8082/inventory?product_id=${product.ID}`);
          const stockText = await stockRes.text();
          const stock = parseInt(stockText.replace("Stock disponible: ", ""));
          return { ...product, stock };
        })
      );
      setProducts(updatedProducts);
      setLoading(false);
    }
    fetchProducts();

    // Load cart from localStorage
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(storedCart);
  }, []);

  function addToCart(product: Product) {
    let updatedCart = [...cart];
    const existingItem = updatedCart.find((item) => item.ID === product.ID);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      updatedCart.push({ ...product, quantity: 1 });
    }

    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setIsCartOpen(true); // ✅ Sidebar stays open, but doesn't block adding more items
  }

  if (loading) return <p>Loading products...</p>;

  return (
    <div className="p-4 relative">
      <h2 className="text-xl font-bold mb-4">Products</h2>
      <div className="grid grid-cols-2 gap-4">
        {products.map((product) => (
          <div key={product.ID} className="border p-4 rounded-lg shadow">
            <h3 className="font-bold">{product.name}</h3>
            <p>${product.price.toFixed(2)}</p>
            <p className={product.stock && product.stock > 0 ? "text-green-600" : "text-red-600"}>
              {product.stock && product.stock > 0 ? `In Stock: ${product.stock}` : "Out of Stock"}
            </p>
            <button
              onClick={() => addToCart(product)}
              disabled={!product.stock || product.stock <= 0}
              className="mt-2 bg-blue-500 text-white px-3 py-1 rounded disabled:bg-gray-400"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} setCart={setCart} />
    </div>
  );
}
