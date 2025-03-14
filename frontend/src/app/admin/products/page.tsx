"use client";

import { useState } from "react";

export default function AdminProducts() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [message, setMessage] = useState("");

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(""); // Clear previous messages

    const productData = {
      name,
      price: parseFloat(price),
      stock: parseInt(stock),
    };

    try {
      const response = await fetch("http://localhost:8083/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        setMessage("✅ Producto creado con éxito");
        setName("");
        setPrice("");
        setStock("");
      } else {
        setMessage("❌ Error al crear el producto");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error en la conexión con el servidor");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4 text-center">Crear Producto</h1>
        
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <input
            type="text"
            placeholder="Nombre del Producto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md"
          />
          <input
            type="number"
            placeholder="Precio"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md"
          />
          <input
            type="number"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
          >
            Crear Producto
          </button>
        </form>

        {message && <p className="text-center mt-4 font-semibold">{message}</p>}
      </div>
    </main>
  );
}
