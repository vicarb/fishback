'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetch('http://localhost:8084/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Auth failed')
        return res.json()
      })
      .then((data) => {
        if (data.role !== 'admin') {
          router.push('/login')
          return
        }
        setUser(data)
      })
      .catch(() => {
        localStorage.removeItem('token')
        router.push('/login')
      })
  }, [router])

  if (!user) return <p className="p-6 text-gray-500">Cargando panel...</p>

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Administración</h1>
        <button
          className="text-sm text-red-600 font-semibold"
          onClick={() => {
            localStorage.removeItem('token')
            router.push('/login')
          }}
        >
          Cerrar sesión
        </button>
      </header>

      <main className="p-6">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Admin Panel</h2>
        <ul className="space-y-2">
          <li>
            <a href="/admin/products" className="text-blue-600 hover:underline">
              ➕ Crear y ver productos
            </a>
          </li>
        </ul>
      </div>
    </main>
    
    </div>
  )
}
