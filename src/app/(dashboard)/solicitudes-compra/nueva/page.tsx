'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Plus, Trash2, Save, ShoppingCart, 
  ChevronRight, Calculator, AlertCircle, Info, Send, Settings, X
} from 'lucide-react'
import { 
  Input, Select, Button, Card, Badge
} from '@/components/ui-kit'
import { useCompany } from '@/hooks/useCompany'
import { useModulePermissions } from '@/hooks/useModulePermissions'

interface RequestItem {
  tempId: number
  productId: string
  productName: string
  sku: string
  category: string
  currentStock: number
  requestedQuantity: number
  reason: string
  unitCost: number
  monthlyAverage: number
  lastSaleDate: string
  currency: string
}

interface Department {
  id: string
  name: string
  description: string | null
}

interface PurchaseReason {
  id: string
  name: string
  description: string | null
  requestType: string
}

const TYPES = [
  { value: '', label: '' },
  { value: 'REPOSICION', label: 'Reposición de Inventario' },
  { value: 'PRODUCTO_NUEVO', label: 'Producto Nuevo' },
  { value: 'PEDIDO_ESPECIAL', label: 'Pedido Especial (Proyecto)' },
]

export default function NuevaSolicitudPage() {
  const router = useRouter()
  const { selectedCompany } = useCompany()
  const permissions = useModulePermissions('solicitudes-compra', { requireAction: 'create' })
  const [isSaving, setIsSaving] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  
  const [formData, setFormData] = useState({
    requestingArea: '',
    requestType: '',
    priority: 'MEDIA',
    notes: '',
    currency: 'USD'
  })
  const [quotationFiles, setQuotationFiles] = useState<File[]>([])
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [reasons, setReasons] = useState<PurchaseReason[]>([])
  const [showReasonsModal, setShowReasonsModal] = useState(false)
  const [newReasonName, setNewReasonName] = useState('')
  const [newReasonDesc, setNewReasonDesc] = useState('')
  const [isSavingReason, setIsSavingReason] = useState(false)

  const [items, setItems] = useState<RequestItem[]>([
    { 
      tempId: Date.now(), 
      productId: '', 
      productName: '', 
      sku: '', 
      category: '', 
      currentStock: 0, 
      requestedQuantity: 1, 
      reason: 'Agotado',
      unitCost: 0,
      monthlyAverage: 0,
      lastSaleDate: '',
      currency: 'USD'
    }
  ])

  // Safe array - always use this instead of items directly
  const itemsArray = useMemo(() => {
    if (!items || !Array.isArray(items)) return [{ tempId: Date.now(), productId: '', productName: '', sku: '', category: '', currentStock: 0, requestedQuantity: 1, reason: 'Agotado', unitCost: 0, monthlyAverage: 0, lastSaleDate: '', currency: 'USD' }]
    return items
  }, [items])

  const addItem = () => {
    setItems([...itemsArray, { 
      tempId: Date.now(), 
      productId: '', 
      productName: '', 
      sku: '', 
      category: '', 
      currentStock: 0, 
      requestedQuantity: 1, 
      reason: 'Agotado',
      unitCost: 0,
      monthlyAverage: 0,
      lastSaleDate: '',
      currency: 'USD'
    }])
  }

  const removeItem = (tempId: number) => {
    if (itemsArray.length > 1) {
      setItems(itemsArray.filter(item => item.tempId !== tempId))
    }
  }

  const updateItem = (tempId: number, field: keyof RequestItem, value: any) => {
    setItems(itemsArray.map(item => item.tempId === tempId ? { ...item, [field]: value } : item))
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return
    if (!formData.requestType) {
      alert('Selecciona el tipo de solicitud')
      return
    }

    try {
      setIsSaving(true)
      const token = localStorage.getItem('accessToken')
      
      // Upload quotation files first
      let quotationUrls: string[] = []
      if (quotationFiles.length > 0) {
        for (const file of quotationFiles) {
          const uploadFormData = new FormData()
          uploadFormData.append('file', file)
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: uploadFormData,
          })
          const uploadData = await uploadRes.json()
          if (uploadData.success) {
            quotationUrls.push(uploadData.data.url)
          }
        }
      }
      
      const response = await fetch('/api/purchase-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: selectedCompany,
          ...formData,
          quotationFiles: quotationUrls,
          items: itemsArray.filter((i: any) => i.productName.trim() !== '')
        })
      })

      const data = await response.json()
      if (data.success) {
        router.push('/solicitudes-compra')
      } else {
        alert(data.error || 'Error al crear solicitud')
      }
    } catch (error) {
      console.error('Error saving request:', error)
      alert('Error interno')
    } finally {
      setIsSaving(false)
    }
  }

  const totalAmount = itemsArray.reduce((sum: number, i: any) => sum + (i.unitCost * i.requestedQuantity), 0)

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!selectedCompany) return
      const token = localStorage.getItem('accessToken')
      if (!token) return

      try {
        const response = await fetch(`/api/departments?companyId=${selectedCompany}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.json()
        if (data.success) {
          setDepartments(data.data)
        }
      } catch (error) {
        console.error('Error fetching departments:', error)
      }
    }

    fetchDepartments()
  }, [selectedCompany])

  // Fetch reasons when requestType changes
  useEffect(() => {
    const fetchReasons = async () => {
      if (!selectedCompany || !formData.requestType) {
        setReasons([])
        return
      }
      const token = localStorage.getItem('accessToken')
      if (!token) return

      try {
        const response = await fetch(
          `/api/purchase-request-reasons?companyId=${selectedCompany}&requestType=${formData.requestType}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const data = await response.json()
        if (data.success) {
          setReasons(data.data)
        }
      } catch (error) {
        console.error('Error fetching reasons:', error)
      }
    }

    fetchReasons()
  }, [selectedCompany, formData.requestType])

  const handleCreateReason = async () => {
    if (!newReasonName.trim() || !formData.requestType || !selectedCompany) return
    
    const token = localStorage.getItem('accessToken')
    if (!token) return

    setIsSavingReason(true)
    try {
      const response = await fetch('/api/purchase-request-reasons', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: selectedCompany,
          requestType: formData.requestType,
          name: newReasonName.trim(),
          description: newReasonDesc.trim() || null
        })
      })
      const data = await response.json()
      if (data.success) {
        setReasons([...reasons, data.data])
        setNewReasonName('')
        setNewReasonDesc('')
      } else {
        alert(data.error || 'Error al crear motivo')
      }
    } catch (error) {
      console.error('Error creating reason:', error)
    } finally {
      setIsSavingReason(false)
    }
  }

  const handleDeleteReason = async (reasonId: string) => {
    if (!confirm('¿Eliminar este motivo?')) return
    
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch('/api/purchase-request-reasons', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: reasonId })
      })
      const data = await response.json()
      if (data.success) {
        setReasons(reasons.filter(r => r.id !== reasonId))
      }
    } catch (error) {
      console.error('Error deleting reason:', error)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/solicitudes-compra')} className="rounded-full hover:bg-slate-100 p-2">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              <span>Compras</span> <ChevronRight className="w-3 h-3" /> <span>Nueva Solicitud</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Crear Solicitud de Compra</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push('/solicitudes-compra')} className="font-bold rounded-xl border-slate-200">
            CANCELAR
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl shadow-lg shadow-blue-100 px-8"
          >
            {isSaving ? 'GUARDANDO...' : (
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" /> ENVIAR SOLICITUD
              </div>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-slate-100 shadow-sm rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Detalle de Productos</h3>
            </div>
            
            <div className="space-y-6">
              {itemsArray.map((item: any, index: number) => (
                <div key={item.tempId} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 relative group transition-all hover:bg-white hover:shadow-md">
                  <button 
                    onClick={() => removeItem(item.tempId)}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código SKU</label>
                        <Input 
                          type="text"
                          placeholder="SKU-001"
                          value={item.sku}
                          onChange={async (e) => {
                            const skuValue = e.target.value
                            updateItem(item.tempId, 'sku', skuValue)
                            
                            if (skuValue && skuValue.length >= 3 && selectedCompany) {
                              try {
                                const token = localStorage.getItem('accessToken')
                                const res = await fetch(`/api/products?companyId=${selectedCompany}&sku=${skuValue}`, {
                                  headers: { Authorization: `Bearer ${token}` }
                                })
                                const data = await res.json()
                                if (data.success && data.data.length > 0) {
                                  const existing = data.data[0]
                                  if (confirm(`Producto "${existing.name}" ya existe en inventario con SKU ${existing.sku}. ¿Deseas usar los datos existentes?`)) {
                                    updateItem(item.tempId, 'productId', existing.id)
                                    updateItem(item.tempId, 'productName', existing.name)
                                    updateItem(item.tempId, 'category', existing.category?.name || '')
                                    updateItem(item.tempId, 'currentStock', existing.stock || 0)
                                    updateItem(item.tempId, 'minStock', existing.minStock || 0)
                                    updateItem(item.tempId, 'unitCost', existing.cost || 0)
                                  }
                                }
                              } catch (err) {
                                console.error('Error checking SKU:', err)
                              }
                            }
                          }}
                          className="bg-white border-slate-200 rounded-xl font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Producto *</label>
                        <Input 
                          type="text"
                          placeholder="Ej: Laptop Dell Inspiron 15"
                          value={item.productName}
                          onChange={(e) => updateItem(item.tempId, 'productName', e.target.value)}
                          className="bg-white border-slate-200 rounded-xl font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                        <Input 
                          type="text"
                          placeholder="SSD, RAM, Cámara, etc."
                          value={item.category}
                          onChange={(e) => updateItem(item.tempId, 'category', e.target.value)}
                          className="bg-white border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Actual</label>
                        <Input 
                          type="number"
                          min="0"
                          value={item.currentStock}
                          onChange={(e) => updateItem(item.tempId, 'currentStock', parseInt(e.target.value) || 0)}
                          className="bg-white border-slate-200 rounded-xl font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cantidad Solicitada *</label>
                        <Input 
                          type="number"
                          min="1"
                          value={item.requestedQuantity}
                          onChange={(e) => updateItem(item.tempId, 'requestedQuantity', parseInt(e.target.value) || 0)}
                          className="bg-white border-slate-200 rounded-xl font-bold text-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo</label>
                          {formData.requestType && (
                            <button
                              type="button"
                              onClick={() => setShowReasonsModal(true)}
                              className="text-[9px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                            >
                              <Settings className="w-3 h-3" /> Gestionar
                            </button>
                          )}
                        </div>
                        <Select 
                          options={[
                            { value: '', label: 'Seleccionar motivo...' },
                            ...reasons.map(r => ({ value: r.name, label: r.name })),
                            ...(reasons.length === 0 ? [
                              { value: 'Agotado', label: 'Stock Agotado' },
                              { value: 'Alta demanda', label: 'Alta Demanda' },
                              { value: 'Proyecto', label: 'Proyecto Específico' },
                            ] : [])
                          ]}
                          value={item.reason}
                          onChange={(e) => updateItem(item.tempId, 'reason', e.target.value)}
                          fullWidth
                          className="bg-white border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Venta</label>
                        <Input 
                          type="date"
                          value={item.lastSaleDate}
                          onChange={(e) => updateItem(item.tempId, 'lastSaleDate', e.target.value)}
                          className="bg-white border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promedio Mensual</label>
                        <Input 
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Ventas/mes"
                          value={item.monthlyAverage}
                          onChange={(e) => updateItem(item.tempId, 'monthlyAverage', parseFloat(e.target.value) || 0)}
                          className="bg-white border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo Unitario</label>
                        <Input 
                          type="text"
                          placeholder={formData.currency === 'NIO' ? 'C$0.00' : '$0.00'}
                          value={item.unitCost || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '')
                            const num = parseFloat(val) || 0
                            updateItem(item.tempId, 'unitCost', num)
                          }}
                          className="bg-white border-slate-200 rounded-xl font-bold"
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Subtotal Estimado</p>
                        <p className="text-2xl font-black text-blue-600">{formData.currency === 'NIO' ? 'C$' : '$'}{(item.unitCost * item.requestedQuantity).toFixed(2)}</p>
                      </div>
                      <div className="text-right text-xs text-blue-600 space-y-1">
                        <div><span className="font-bold">{item.requestedQuantity}</span> unidades</div>
                        <div>@ <span className="font-bold">{formData.currency === 'NIO' ? 'C$' : '$'}{item.unitCost.toFixed(2)}</span> c/u</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              variant="outline" 
              onClick={addItem}
              className="w-full mt-6 border-dashed border-2 border-slate-200 py-8 rounded-2xl hover:bg-slate-50 text-slate-500 font-bold gap-2"
            >
              <Plus className="w-5 h-5" /> AGREGAR OTRO PRODUCTO
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-8 border-slate-100 shadow-sm rounded-2xl">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Configuración</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-tighter ml-1">Área Solicitante</label>
                <Select 
                  options={[
                    { value: '', label: 'Seleccionar área...' },
                    ...departments.map(d => ({ value: d.id, label: d.name }))
                  ]}
                  value={formData.requestingArea}
                  onChange={(e) => setFormData({...formData, requestingArea: e.target.value})}
                  fullWidth
                  className="rounded-xl border-slate-200 font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-tighter ml-1">Tipo de Solicitud</label>
                <Select 
                  options={TYPES}
                  value={formData.requestType}
                  onChange={(e) => setFormData({...formData, requestType: e.target.value})}
                  fullWidth
                  className="rounded-xl border-slate-200 font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-tighter ml-1">Prioridad</label>
                <div className="grid grid-cols-3 gap-2">
                  {['BAJA', 'MEDIA', 'ALTA'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({...formData, priority: p})}
                      className={`
                        py-3 px-1 rounded-xl text-[11px] font-black transition-all border-2
                        ${formData.priority === p 
                          ? p === 'ALTA' ? 'bg-red-50 border-red-500 text-red-700' : 
                            p === 'MEDIA' ? 'bg-blue-50 border-blue-500 text-blue-700' :
                            'bg-slate-50 border-slate-500 text-slate-700'
                          : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                        }
                      `}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-tighter ml-1">Moneda</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, currency: 'NIO'})}
                    className={`
                      py-3 px-4 rounded-xl text-[11px] font-black transition-all border-2 flex items-center justify-center gap-2
                      ${formData.currency === 'NIO' 
                        ? 'bg-green-50 border-green-500 text-green-700' 
                        : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                      }
                    `}
                  >
                    <span className="text-base">C$</span> CÓRDOBAS
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, currency: 'USD'})}
                    className={`
                      py-3 px-4 rounded-xl text-[11px] font-black transition-all border-2 flex items-center justify-center gap-2
                      ${formData.currency === 'USD' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                      }
                    `}
                  >
                    <span className="text-base">$</span> DÓLARES
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-tighter ml-1">Notas adicionales</label>
                <textarea 
                  className="w-full rounded-2xl border-2 border-slate-100 p-4 text-sm focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-300 min-h-[120px]"
                  placeholder="Detalles sobre el uso o urgencia..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-tighter ml-1">
                  📎 Cotizaciones de Proveedores (2-3 archivos)
                </label>
                <p className="text-[10px] text-slate-400 ml-1 mb-2">
                  Adjunta cotizaciones para validar precios al momento de aprobación
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length + quotationFiles.length > 3) {
                      alert('Máximo 3 archivos de cotización permitidos')
                      return
                    }
                    setQuotationFiles([...quotationFiles, ...files])
                  }}
                  className="block w-full text-[11px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
                />
                {quotationFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {quotationFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-semibold text-green-800 truncate max-w-[180px]">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setQuotationFiles(quotationFiles.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-100">
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 opacity-80">Resumen Estimado</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center opacity-80 text-sm">
                <span>Items</span>
                <span className="font-bold">{items.length}</span>
              </div>
              <div className="flex justify-between items-center opacity-80 text-sm">
                <span>Cant. Total</span>
                <span className="font-bold">{items.reduce((sum, i) => sum + i.requestedQuantity, 0)}</span>
              </div>
              <div className="pt-4 mt-4 border-t border-white/20">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold">TOTAL ESTIMADO</span>
                  <p className="text-3xl font-black">{formData.currency === 'NIO' ? 'C$' : '$'}{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
              Al enviar esta solicitud, será notificada al área de administración para su revisión y aprobación. El stock no se verá afectado hasta que se marque como recibida.
            </p>
          </div>
        </div>
      </div>

      {/* Reasons Management Modal */}
      {showReasonsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[500px] shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">Gestionar Motivos</h3>
                <p className="text-xs text-slate-500">
                  Tipo: {TYPES.find(t => t.value === formData.requestType)?.label}
                </p>
              </div>
              <button
                onClick={() => setShowReasonsModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Add new reason */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Nuevo Motivo
              </label>
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Nombre del motivo"
                  value={newReasonName}
                  onChange={(e) => setNewReasonName(e.target.value)}
                  className="bg-white"
                />
                <Input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={newReasonDesc}
                  onChange={(e) => setNewReasonDesc(e.target.value)}
                  className="bg-white"
                />
                <Button
                  onClick={handleCreateReason}
                  disabled={isSavingReason || !newReasonName.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isSavingReason ? 'Guardando...' : 'Agregar Motivo'}
                </Button>
              </div>
            </div>

            {/* Existing reasons */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                Motivos Existentes ({reasons.length})
              </label>
              {reasons.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-xl">
                  No hay motivos personalizados para este tipo de solicitud.
                  <br />
                  <span className="text-xs">Se usarán los motivos predeterminados.</span>
                </p>
              ) : (
                <div className="space-y-2">
                  {reasons.map(reason => (
                    <div
                      key={reason.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{reason.name}</p>
                        {reason.description && (
                          <p className="text-xs text-slate-500">{reason.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteReason(reason.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Eliminar motivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setShowReasonsModal(false)}
                className="w-full"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
