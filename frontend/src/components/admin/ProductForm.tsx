"use client";
import { useState, useEffect } from "react";

export default function ProductForm({ onProductCreated, editingProduct, onCancelEdit }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setPrice(editingProduct.price);
      setStock(editingProduct.stock || "");
    }
  }, [editingProduct]);

  async function handleSubmit(e) {
    e.preventDefault();
    const productData = { name, price: parseFloat(price), stock: parseInt(stock, 10) };

    try {
      if (editingProduct) {
        await fetch(`http://localhost:8083/products/${editingProduct.ID}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });
      } else {
        await fetch("http://localhost:8083/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });
      }
      onProductCreated();
      setName("");
      setPrice("");
      setStock("");
      onCancelEdit();
    } catch (error) {
      console.error("Error saving product:", error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 shadow-md rounded-lg mb-6">
      <h2 className="text-xl font-semibold mb-4">{editingProduct ? "Edit Product" : "Add New Product"}</h2>
      <input
        type="text"
        placeholder="Product Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-2 border rounded mb-2"
      />
      <input
        type="number"
        placeholder="Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-full p-2 border rounded mb-2"
      />
      <input
        type="number"
        placeholder="Stock"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        className="w-full p-2 border rounded mb-2"
      />
      <div className="flex gap-4">
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          {editingProduct ? "Update Product" : "Add Product"}
        </button>
        {editingProduct && (
          <button type="button" onClick={onCancelEdit} className="bg-gray-500 text-white px-4 py-2 rounded">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
