'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Plus, Trash2, Save, ShoppingCart, 
  ChevronRight, Calculator, AlertCircle, Info, Send
} from 'lucide-react'
import { 
  Input, Select, Button, Card, Badge, 
  ProductAutocomplete 
} from '@/components/ui-kit'
import { useCompany } from '@/hooks/useCompany'

interface RequestItem {
  tempId: number
  productId: string
  productName: string
  sku: string
  category: string
  currentStock: number
  minStock: number
  requestedQuantity: number
  reason: string
  unitCost: number
  monthlyAverage: number
}

const AREAS = [
  { value: 'ADMINISTRACION', label: 'Administración' },
  { value: 'VENTAS', label: 'Ventas' },
  { value: 'TECNICA', label: 'Área Técnica' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'SOPORTE', label: 'Soporte Post-Venta' },
  { value: 'ALMACEN', label: 'Almacén/Bodega' },
]

const TYPES = [
  { value: 'REPOSICION', label: 'Reposición de Inventario' },
  { value: 'PRODUCTO_NUEVO', label: 'Producto Nuevo' },
  { value: 'PEDIDO_ESPECIAL', label: 'Pedido Especial (Proyecto)' },
]

export default function NuevaSolicitudPage() {
  const router = useRouter()
  const { selectedCompany } = useCompany()
  const [isSaving, setIsSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    requestingArea: 'TECNICA',
    requestType: 'REPOSICION',
    priority: 'MEDIA',
    notes: '',
  })

  const [items, setItems] = useState<RequestItem[]>([
    { 
      tempId: Date.now(), 
      productId: '', 
      productName: '', 
      sku: '', 
      category: '', 
      currentStock: 0, 
      minStock: 0, 
      requestedQuantity: 1, 
      reason: 'Agotado',
      unitCost: 0,
      monthlyAverage: 0
    }
  ])

  // Safe array - always use this instead of items directly
  const itemsArray = useMemo(() => {
    if (!Array.isArray(items)) return []
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
      minStock: 0, 
      requestedQuantity: 1, 
      reason: 'Agotado',
      unitCost: 0,
      monthlyAverage: 0
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

  const handleProductSelect = (tempId: number, product: any) => {
    setItems(itemsArray.map(item => {
      if (item.tempId === tempId) {
        return {
          ...item,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          category: product.category?.name || 'Varios',
          currentStock: product.stock,
          minStock: product.minStock,
          unitCost: product.cost || 0,
          monthlyAverage: 0
        }
      }
      return item
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return

    try {
      setIsSaving(true)
      const token = localStorage.getItem('accessToken')
      
      const response = await fetch('/api/purchase-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: selectedCompany,
          ...formData,
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto / Servicio</label>
                        <ProductAutocomplete 
                          companyId={selectedCompany || ''}
                          value={item.productName}
                          onChange={(val) => updateItem(item.tempId, 'productName', val)}
                          onSelect={(prod) => handleProductSelect(item.tempId, prod)}
                          className="w-full bg-white border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cantidad Solicitada</label>
                          <Input 
                            type="number"
                            min="1"
                            value={item.requestedQuantity}
                            onChange={(e) => updateItem(item.tempId, 'requestedQuantity', parseInt(e.target.value) || 0)}
                            className="bg-white border-slate-200 rounded-xl font-bold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo</label>
                          <Select 
                            options={[
                              { value: 'Agotado', label: 'Stock Agotado' },
                              { value: 'PROYECTO', label: 'Proyecto Específico' },
                              { value: 'ALTA DEMANDA', label: 'Alta Demanda' },
                              { value: 'CLIENTE', label: 'Pedido de Cliente' },
                            ]}
                            value={item.reason}
                            onChange={(e) => updateItem(item.tempId, 'reason', e.target.value)}
                            fullWidth
                            className="bg-white border-slate-200 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Stock Actual</p>
                          <p className="text-xl font-black text-slate-800">{item.currentStock}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Mínimo</p>
                          <p className="text-xl font-black text-red-500">{item.minStock}</p>
                        </div>
                      </div>
                      <div className="pt-4 mt-4 border-t border-slate-50 flex justify-between items-end">
                        <div className="space-y-1 text-slate-500 text-[11px] font-medium">
                          <div className="flex items-center gap-1">
                            <Info className="w-3 h-3" /> SKU: {item.sku || '---'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calculator className="w-3 h-3" /> Costo Est: ${item.unitCost.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Subtotal Est.</p>
                          <p className="text-lg font-black text-blue-600">${(item.unitCost * item.requestedQuantity).toFixed(2)}</p>
                        </div>
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
                  options={AREAS}
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
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-tighter ml-1">Notas adicionales</label>
                <textarea 
                  className="w-full rounded-2xl border-2 border-slate-100 p-4 text-sm focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-300 min-h-[120px]"
                  placeholder="Detalles sobre el uso o urgencia..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
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
                  <p className="text-3xl font-black">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
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
    </div>
  )
}
