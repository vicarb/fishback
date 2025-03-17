"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useCart } from "@/context/CartContext";

export default function ProductDetail() {
  const { id } = useParams();
  const productId = Number(id);
  const { addToCart, setCartOpen } = useCart(); // ✅ Use setCartOpen

  const [product, setProduct] = useState<any>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`http://localhost:8083/products/${productId}`);
        const productData = await res.json();

        const stockRes = await fetch(`http://localhost:8082/inventory?product_id=${productId}`);
        const stockText = await stockRes.text();
        const stockValue = parseInt(stockText.replace("Stock disponible: ", ""), 10);

        setProduct(productData);
        setStock(stockValue);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId]);

  if (loading) return <p>Loading product details...</p>;
  if (!product) return <p>Product not found.</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">{product.name}</h2>
      <p className="text-lg text-gray-700">${product.price.toFixed(2)}</p>
      <p className={stock && stock > 0 ? "text-green-600" : "text-red-600"}>
        {stock && stock > 0 ? `In Stock: ${stock}` : "Out of Stock"}
      </p>

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="px-3 py-1 bg-gray-300 rounded"
        >
          -
        </button>
        <span className="text-lg font-bold">{quantity}</span>
        <button
          onClick={() => setQuantity((q) => (stock && q < stock ? q + 1 : q))}
          className="px-3 py-1 bg-gray-300 rounded"
        >
          +
        </button>
      </div>

      <button
        onClick={() => {
          addToCart({ ...product, quantity });
          setCartOpen(true); // ✅ Open sidebar when adding to cart
        }}
        disabled={!stock || stock <= 0}
        className={`mt-4 w-full text-white py-2 rounded 
          ${stock && stock > 0 ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400 cursor-not-allowed"}`}
      >
        Add to Cart
      </button>
    </div>
  );
}
