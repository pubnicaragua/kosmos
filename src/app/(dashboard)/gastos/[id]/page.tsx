'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, FileText, ExternalLink, Clock, DollarSign, Building, User, Calendar, Tag, CreditCard, Link2 } from 'lucide-react'
import { Button, Card, Badge } from '@/components/ui-kit'
import { useModulePermissions } from '@/hooks/useModulePermissions'

interface ExpenseDetail {
  id: string
  refNumber: string
  companyId: string
  company: { id: string; name: string; logo: string | null }
  provider: string
  concept: string
  category: string
  method: string
  amount: number
  currency: string
  status: 'PAID' | 'PENDING' | 'CANCELLED'
  date: string
  notes: string | null
  createdAt: string
  updatedAt: string
  purchaseRequestId?: string | null
  purchaseRequest?: {
    id: string
    requestNumber: string
    status: string
  } | null
}

interface ExpenseHistory {
  id: string
  action: string
  description: string
  createdAt: string
  user?: { name: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PAID: { label: 'Pagado', color: 'bg-green-100 text-green-700 border-green-200' },
  PENDING: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-200' }
}

export default function GastoDetallePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const permissions = useModulePermissions('gastos')
  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [history, setHistory] = useState<ExpenseHistory[]>([])
  const [relatedExpenses, setRelatedExpenses] = useState<ExpenseDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchExpense()
  }, [params.id])

  const fetchExpense = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/expenses/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      
      if (data.success) {
        setExpense(data.data)
        
        // Fetch related expenses from same provider
        if (data.data.provider) {
          const relatedRes = await fetch(`/api/expenses?provider=${encodeURIComponent(data.data.provider)}&companyId=${data.data.companyId}&limit=5`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const relatedData = await relatedRes.json()
          if (relatedData.success) {
            setRelatedExpenses(relatedData.data.filter((e: any) => e.id !== params.id).slice(0, 4))
          }
        }
      }
    } catch (error) {
      console.error('Error fetching expense:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return
    
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/expenses/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      
      if (data.success) {
        router.push('/gastos')
      } else {
        alert(data.error || 'Error al eliminar gasto')
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Error al eliminar gasto')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-slate-200 rounded"></div>
          <div className="h-64 bg-slate-100 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  if (!expense) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <p className="text-slate-500">Gasto no encontrado</p>
        <Button onClick={() => router.push('/gastos')} className="mt-4">
          Volver a Gastos
        </Button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[expense.status] || STATUS_CONFIG.PENDING
  const currencySymbol = expense.currency === 'NIO' ? 'C$' : '$'

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/gastos')} 
            className="rounded-full hover:bg-slate-100 p-2"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">← Volver a Gastos</p>
            <h1 className="text-2xl font-black text-slate-900 mt-1">Detalle del Gasto</h1>
            <p className="text-sm text-slate-500">{expense.refNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {permissions.canEdit && (
            <Button 
              variant="outline" 
              onClick={() => router.push(`/gastos?edit=${expense.id}`)}
              className="rounded-xl border-slate-200"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
          {permissions.canDelete && (
            <Button 
              variant="outline" 
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-slate-100 rounded-2xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <Badge className={`${statusConfig.color} border font-bold text-xs px-3 py-1 rounded-full`}>
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase">Monto</p>
                <p className="text-4xl font-black text-slate-900">
                  {currencySymbol}{expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Building className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Empresa</p>
                    <p className="text-sm font-semibold text-slate-900">{expense.company?.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <User className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Proveedor</p>
                    <p className="text-sm font-semibold text-slate-900">{expense.provider || 'No especificado'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Fecha</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {new Date(expense.date).toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Tag className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Categoría</p>
                    <p className="text-sm font-semibold text-slate-900">{expense.category}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Método de Pago</p>
                    <p className="text-sm font-semibold text-slate-900">{expense.method}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <Clock className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Registrado</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {new Date(expense.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {expense.notes && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Concepto / Notas</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl">{expense.concept}</p>
                {expense.notes && (
                  <p className="text-sm text-slate-600 mt-2">{expense.notes}</p>
                )}
              </div>
            )}

            {/* Link to Purchase Request */}
            {expense.purchaseRequest && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <Link2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase">Derivado de Solicitud de Compra</p>
                      <p className="text-sm font-semibold text-blue-900">{expense.purchaseRequest.requestNumber}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/solicitudes-compra/${expense.purchaseRequest?.id}`)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-100"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver Solicitud
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Provider Summary */}
          <Card className="p-6 border-slate-100 rounded-2xl">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
              Resumen del Proveedor
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Proveedor</span>
                <span className="text-sm font-bold text-slate-900">{expense.provider || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total Gastos</span>
                <span className="text-sm font-bold text-slate-900">{relatedExpenses.length + 1}</span>
              </div>
            </div>
          </Card>

          {/* Related Expenses */}
          {relatedExpenses.length > 0 && (
            <Card className="p-6 border-slate-100 rounded-2xl">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                Historial con este Proveedor
              </h3>
              <div className="space-y-3">
                {relatedExpenses.map(related => (
                  <button
                    key={related.id}
                    onClick={() => router.push(`/gastos/${related.id}`)}
                    className="w-full text-left p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-400">{related.refNumber}</p>
                        <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                          {related.concept.substring(0, 30)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">
                          {related.currency === 'NIO' ? 'C$' : '$'}{related.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(related.date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="p-6 border-slate-100 rounded-2xl bg-gradient-to-br from-slate-50 to-white">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
              Acciones Rápidas
            </h3>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={() => router.push('/gastos')}
                className="w-full justify-start rounded-xl"
              >
                <FileText className="w-4 h-4 mr-2" />
                Ver todos los gastos
              </Button>
              {expense.purchaseRequest && (
                <Button 
                  variant="outline" 
                  onClick={() => router.push(`/solicitudes-compra/${expense.purchaseRequest?.id}`)}
                  className="w-full justify-start rounded-xl text-blue-600 border-blue-200"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Ver solicitud origen
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
