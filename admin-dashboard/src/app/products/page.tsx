"use client";

import { useState, useEffect } from "react";

type Product = {
  ID: number;
  name: string;
  price: number;
  stock: number;
};

export default function AdminProducts() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("http://localhost:8083/products");
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const productData = { name, price: parseFloat(price), stock: parseInt(stock) };

    try {
      const response = await fetch("http://localhost:8083/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        setMessage("✅ Producto creado con éxito");
        setName("");
        setPrice("");
        setStock("");
        fetchProducts(); // Refresh products list
      } else {
        setMessage("❌ Error al crear el producto");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error en la conexión con el servidor");
    }
  }

  async function deleteProduct(id: number) {
    try {
      const res = await fetch(`http://localhost:8083/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage("❌ Producto eliminado");
        fetchProducts(); // Refresh products list
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Administrar Productos</h1>

      {/* Create Product Form */}
      <form onSubmit={handleCreateProduct} className="bg-white p-6 rounded-lg shadow-md w-full max-w-md mx-auto space-y-4">
        <input type="text" placeholder="Nombre del Producto" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2 border rounded-md" />
        <input type="number" placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full px-4 py-2 border rounded-md" />
        <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} required className="w-full px-4 py-2 border rounded-md" />
        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600">Crear Producto</button>
      </form>

      {/* Product List */}
      <h2 className="text-xl font-bold mt-8">Lista de Productos</h2>
      {products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {products.map((product) => (
            <div key={product.ID} className="bg-white p-4 shadow-md rounded-md flex justify-between items-center">
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-gray-500">${product.price.toFixed(2)}</p>
                <p className="text-sm text-gray-400">Stock: {product.stock}</p>
              </div>
              <button onClick={() => deleteProduct(product.ID)} className="text-red-500 hover:text-red-700">
                🗑 Eliminar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center mt-4">No hay productos disponibles.</p>
      )}

      {message && <p className="text-center mt-4 font-semibold">{message}</p>}
    </main>
  );
}
