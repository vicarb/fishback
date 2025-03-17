"use client";
import { useState, useEffect } from "react";

export default function AdminProducts() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState([]);
  const [stockData, setStockData] = useState<{ [key: number]: number }>({}); // Stores stock levels

  // Fetch Products & Stock
  useEffect(() => {
    async function fetchProducts() {
      const res = await fetch("http://localhost:8083/products");
      if (res.ok) {
        const productList = await res.json();
        setProducts(productList);
        fetchStockData(productList);
      }
    }
    fetchProducts();
  }, [message]);

  // Fetch Stock Data from Inventory Service
  async function fetchStockData(products: any[]) {
    const stockInfo: { [key: number]: number } = {};

    for (const product of products) {
      try {
        const res = await fetch(`http://localhost:8082/inventory?product_id=${product.ID}`);
        const stockText = await res.text();
        const stockValue = parseInt(stockText.replace("Stock disponible: ", ""), 10);
        stockInfo[product.ID] = stockValue;
      } catch (error) {
        console.error(`Error fetching stock for product ${product.ID}:`, error);
        stockInfo[product.ID] = 0; // Assume 0 if failed
      }
    }

    setStockData(stockInfo);
  }

  // Handle Product Creation
  const handleCreateProduct = async (e: React.FormEvent) => {
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
      } else {
        setMessage("❌ Error al crear el producto");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error en la conexión con el servidor");
    }
  };

  // Handle Product Deletion
  async function deleteProduct(id: number) {
    await fetch(`http://localhost:8083/products/${id}`, { method: "DELETE" });
    setMessage("❌ Producto eliminado");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Administrar Productos</h1>

      {/* Product Creation Form */}
      <form onSubmit={handleCreateProduct} className="bg-white p-6 rounded-lg shadow-md w-full max-w-md mx-auto space-y-4">
        <input type="text" placeholder="Nombre del Producto" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2 border rounded-md" />
        <input type="number" placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full px-4 py-2 border rounded-md" />
        <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} required className="w-full px-4 py-2 border rounded-md" />
        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600">Crear Producto</button>
      </form>

      {/* Product List */}
      <h2 className="text-xl font-bold mt-8">Lista de Productos</h2>
      {products.length > 0 ? (
        products.map((product) => (
          <div key={product.ID} className="bg-white p-4 shadow-md rounded-md mt-4 flex justify-between items-center">
            <div>
              <span className="font-semibold">{product.name}</span>
              <p className="text-gray-600 text-sm">💰 ${product.price}</p>
              <p className="text-xs text-gray-500">📦 Stock: {stockData[product.ID] !== undefined ? stockData[product.ID] : "Loading..."}</p>
            </div>
            <button onClick={() => deleteProduct(product.ID)} className="text-red-500">🗑️ Eliminar</button>
          </div>
        ))
      ) : (
        <p className="mt-4 text-center text-gray-500">No hay productos disponibles.</p>
      )}

      {message && <p className="text-center mt-4 font-semibold">{message}</p>}
    </main>
  );
}
