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

  if (!user) {
    return <p className="p-4">Cargando...</p>
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Bienvenido, Admin</h1>
      <p className="mt-2 text-gray-600">Email: {user.email}</p>
    </div>
  )
}
