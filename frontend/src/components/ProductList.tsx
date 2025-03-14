"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Product = {
  ID: number;
  name: string;
  price: number;
  stock?: number;
};

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  if (loading) return <p>Loading products...</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Products</h2>
      <div className="grid grid-cols-2 gap-4">
        {products.map((product) => (
          <Link href={`/product/${product.ID}`} key={product.ID}>
            <div className="border p-4 rounded-lg shadow cursor-pointer hover:shadow-lg transition">
              <h3 className="font-bold">{product.name}</h3>
              <p>${product.price.toFixed(2)}</p>
              <p className={product.stock && product.stock > 0 ? "text-green-600" : "text-red-600"}>
                {product.stock && product.stock > 0 ? `In Stock: ${product.stock}` : "Out of Stock"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
