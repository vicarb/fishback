'use client'

import { useState } from 'react'

type Props = {
  productId: number
  onSuccess: () => void
}

export default function AdjustStockForm({ productId, onSuccess }: Props) {
  const [change, setChange] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const res = await fetch('http://localhost:8082/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        change: parseInt(change),
        reason,
      }),
    })

    setLoading(false)
    if (res.ok) {
      setChange('')
      setReason('')
      setMessage('✅ Stock ajustado')
      onSuccess()
    } else {
      setMessage('❌ Error al ajustar stock')
    }
  }

  return (
    <form onSubmit={handleAdjust} className="space-y-2 mt-2 bg-gray-50 p-4 rounded border">
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="+/- cantidad"
          className="border p-2 rounded w-32"
          required
          value={change}
          onChange={(e) => setChange(e.target.value)}
        />
        <input
          type="text"
          placeholder="Razón del ajuste"
          className="border p-2 rounded flex-1"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white px-4 rounded hover:bg-indigo-700"
        >
          {loading ? 'Enviando...' : 'Aplicar'}
        </button>
      </div>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </form>
  )
}
