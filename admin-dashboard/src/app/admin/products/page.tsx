'use client'

import { useEffect, useState } from 'react'

type Product = {
  id: number
  name: string
  price: number
  stock?: number
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({ name: '', price: '', stock: '' })
  const [loading, setLoading] = useState(false)

  const fetchProductsWithStock = async () => {
    const productRes = await fetch('http://localhost:8083/products')
    const products: Product[] = await productRes.json()
    console.log(products)

    const withStock = await Promise.all(
      products.map(async (p) => {
        const res = await fetch(`http://localhost:8082/inventory?product_id=${p.ID}`)
        const text = await res.text()
        const stock = parseInt(text.replace(/\D/g, '')) || 0
        return { ...p, stock }
      })
    )

    setProducts(withStock)
  }

  useEffect(() => {
    fetchProductsWithStock()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('http://localhost:8083/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
      }),
    })

    setLoading(false)
    if (res.ok) {
      setForm({ name: '', price: '', stock: '' })
      await fetchProductsWithStock()
    } else {
      alert('❌ Error creating product')
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📦 Productos & Inventario</h1>

      {/* Form */}
      <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow mb-10">
        <h2 className="text-xl font-semibold mb-4">➕ Crear nuevo producto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Nombre"
            className="border p-2 rounded"
            value={form.name}
            required
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Precio"
            className="border p-2 rounded"
            value={form.price}
            required
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <input
            type="number"
            placeholder="Stock inicial"
            className="border p-2 rounded"
            value={form.stock}
            required
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
        >
          {loading ? 'Creando...' : 'Crear Producto'}
        </button>
      </form>

      {/* Product Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">📃 Lista de productos</h2>
        <table className="w-full table-auto text-left border-t">
          <thead>
            <tr className="border-b">
              <th className="py-2">ID</th>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={`product-${p.ID ?? Math.random()}`} className="border-b hover:bg-gray-50">
                <td className="py-2">{p.ID}</td>
                <td>{p.name}</td>
                <td>${p.price.toFixed(2)}</td>
                <td>{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
