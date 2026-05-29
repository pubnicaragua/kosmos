'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Edit2, Trash2, Check, X, Building2, Calendar, CreditCard, Tag, DollarSign, Clock, FileText, ArrowRight } from 'lucide-react'
import { useModulePermissions } from '@/hooks/useModulePermissions'
import { Card } from '@/components/ui-kit/Card'
import { Badge } from '@/components/ui-kit/Badge'
import Link from 'next/link'

interface PurchaseRequestOrigin {
  id: string
  requestNumber: string
  status: string
  requestingArea: string
  createdAt: string
}

interface ExpenseDetail {
  id: string
  company: { name: string }
  date: string
  refNumber: string
  provider: string
  concept: string
  category: string
  method: string
  amount: number
  status: string
  companyId: string
  createdAt: string
  updatedAt: string
  purchaseRequests?: PurchaseRequestOrigin[]
}

export default function ExpenseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const permissions = useModulePermissions('gastos', { requireAction: 'view' })
  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<ExpenseDetail>>({})

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

  const handleEdit = () => {
    setEditForm({
      provider: expense?.provider,
      concept: expense?.concept,
      category: expense?.category,
      method: expense?.method,
      amount: expense?.amount,
      date: expense?.date,
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const res = await fetch(`/api/expenses/${params.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      const data = await res.json()
      if (data.success) {
        setExpense({ ...expense!, ...editForm })
        setIsEditing(false)
        // Opcional: mostrar notificación de éxito
      }
    } catch (err) {
      alert('Error al actualizar')
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este gasto?')) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const res = await fetch(`/api/expenses/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (data.success) {
        router.push('/finanzas/gastos')
      }
    } catch (err) {
      alert('Error al eliminar')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const res = await fetch(`/api/expenses/${params.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()
      if (data.success) {
        setExpense({ ...expense!, status: newStatus, updatedAt: new Date().toISOString() })
      }
    } catch (err) {
      alert('Error al actualizar estado')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 rotate-180" />
          Volver
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <X className="w-5 h-5 text-red-500" />
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1 transition-colors">
            <ArrowRight className="w-4 h-4 rotate-180" />
            Volver a Gastos
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {expense?.refNumber || 'Detalle del Gasto'}
            </h1>
            {expense?.status === 'PAID' && <Badge variant="success">Pagado</Badge>}
            {expense?.status === 'PENDING' && <Badge variant="warning">Pendiente</Badge>}
            {expense?.status === 'CANCELLED' && <Badge variant="default">Anulado</Badge>}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              {permissions.canEdit && (
                <button onClick={handleEdit} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors font-medium text-sm shadow-sm">
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              )}
              {permissions.canDelete && (
                <button onClick={handleDelete} className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 transition-colors font-medium text-sm shadow-sm">
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors font-medium text-sm shadow-sm">
                <X className="w-4 h-4" />
                Cancelar
              </button>
              {permissions.canEdit && (
                <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors font-medium text-sm shadow-sm">
                  <Check className="w-4 h-4" />
                  Guardar
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - General Info & Provider */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Información General</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-500 mb-1">Concepto</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.concept || ''}
                    onChange={(e) => setEditForm({ ...editForm, concept: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                ) : (
                  <p className="text-gray-900 font-medium text-lg">{expense?.concept}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                  <DollarSign className="w-4 h-4" />
                  Monto Total
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.amount || 0}
                    onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(expense?.amount || 0)}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                  <Calendar className="w-4 h-4" />
                  Fecha del Gasto
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.date?.split('T')[0] || ''}
                    onChange={(e) => setEditForm({ ...editForm, date: new Date(e.target.value).toISOString() })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                ) : (
                  <p className="text-gray-900">{expense?.date ? new Date(expense.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                  <Tag className="w-4 h-4" />
                  Categoría
                </label>
                {isEditing ? (
                  <select
                    value={editForm.category || ''}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="Operaciones">Operaciones</option>
                    <option value="Nómina">Nómina</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Servicios">Servicios</option>
                    <option value="General">General</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{expense?.category}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                  <CreditCard className="w-4 h-4" />
                  Método de Pago
                </label>
                {isEditing ? (
                  <select
                    value={editForm.method || ''}
                    onChange={(e) => setEditForm({ ...editForm, method: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{expense?.method}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Estado</label>
                {isEditing ? (
                  <select
                    value={expense?.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="PAID">Pagado</option>
                    <option value="CANCELLED">Anulado</option>
                  </select>
                ) : (
                  <p className="text-gray-900 font-medium">
                    {expense?.status === 'PAID' ? 'Completado (Pagado)' : expense?.status === 'PENDING' ? 'En Proceso (Pendiente)' : 'Cancelado'}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Proveedor</h2>
            </div>
            
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Proveedor</label>
                    <input
                      type="text"
                      value={editForm.provider || ''}
                      onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                      placeholder="Ingrese el proveedor"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Beneficiario / Vendedor</p>
                    <p className="text-lg font-semibold text-gray-900">{expense?.provider}</p>
                  </div>
                  {/* Placeholder for future provider profile link */}
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Origin & History */}
        <div className="space-y-6">
          
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Origen del Gasto</h2>
            
            {expense?.purchaseRequests && expense.purchaseRequests.length > 0 ? (
              <div className="space-y-3">
                {expense.purchaseRequests.map(req => (
                  <div key={req.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-gray-900">{req.requestNumber}</p>
                      <Badge variant={req.status === 'APROBADA' ? 'success' : 'default'} className="text-[10px] px-1.5 py-0.5">
                        {req.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">Solicitado por: <span className="font-medium text-gray-700">{req.requestingArea}</span></p>
                    
                    <Link href={`/solicitudes-compra/${req.id}`} className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                      Ver Solicitud <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                <p className="text-sm text-gray-500">Este gasto no proviene de una solicitud de compra.</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Historial</h2>
            </div>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:ml-[1.2rem] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              
              {/* Evento de Actualización */}
              {expense?.updatedAt && expense.updatedAt !== expense.createdAt && (
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 ring-4 ring-white z-10 shrink-0">
                      <Edit2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Gasto Actualizado</p>
                      <p className="text-xs text-gray-500">
                        {new Date(expense.updatedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Evento de Creación */}
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3 w-full">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-50 text-green-600 ring-4 ring-white z-10 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Gasto Registrado</p>
                    <p className="text-xs text-gray-500">
                      {expense?.createdAt ? new Date(expense.createdAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}