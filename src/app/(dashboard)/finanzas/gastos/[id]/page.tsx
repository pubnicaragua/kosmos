'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface ExpenseDetail {
  id: string
  company: string
  date: string
  refNumber: string
  provider: string
  concept: string
  category: string
  method: string
  amount: number
  status: string
  companyId: string
}

export default function ExpenseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchExpense = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const response = await fetch(`/api/expenses/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.json()
        
        if (data.success && data.data) {
          setExpense(data.data)
        } else {
          setError(data.message || 'Gasto no encontrado')
        }
      } catch (err) {
        setError('Error al cargar el gasto')
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchExpense()
    }
  }, [params.id, router])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <button onClick={() => router.back()} className="text-blue-600 hover:underline mb-4">
          ← Volver
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button onClick={() => router.back()} className="text-blue-600 hover:underline mb-6">
        ← Volver a Gastos
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Detalle del Gasto</h1>
          <p className="text-sm text-gray-500">{expense?.refNumber || 'Sin referencia'}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Empresa</label>
              <p className="text-gray-900">{expense?.company}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Fecha</label>
              <p className="text-gray-900">{expense?.date ? new Date(expense.date).toLocaleDateString('es-ES') : '-'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Proveedor</label>
              <p className="text-gray-900">{expense?.provider}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Categoría</label>
              <p className="text-gray-900">{expense?.category}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Método</label>
              <p className="text-gray-900">{expense?.method}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Estado</label>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                expense?.status === 'PAID' ? 'bg-green-100 text-green-800' :
                expense?.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {expense?.status === 'PAID' ? 'Pagado' : expense?.status === 'PENDING' ? 'Pendiente' : 'Anulado'}
              </span>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase">Concepto</label>
              <p className="text-gray-900">{expense?.concept}</p>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase">Monto</label>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(expense?.amount || 0)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}