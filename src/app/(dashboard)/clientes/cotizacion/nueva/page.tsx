'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
import { Select } from '@/components/ui-kit/Select'
import { Input } from '@/components/ui-kit/Input'

interface QuoteItem {
  tempId: number
  productId: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  tax: number
  total: number
}

export default function NuevaCotizacionPage() {
  const router = useRouter()
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedClient, setSelectedClient] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState('')
  const [seller, setSeller] = useState('')
  const [clientNotes, setClientNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([
    { tempId: 1, productId: '', description: '', quantity: 1, unitPrice: 0, discount: 0, tax: 15, total: 0 }
  ])
  const [globalDiscount, setGlobalDiscount] = useState(0)

  const addItem = () => {
    setItems([...items, {
      tempId: Date.now(),
      productId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 15,
      total: 0
    }])
  }

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    
    const item = updated[index]
    const subtotal = item.quantity * item.unitPrice
    const discountAmount = subtotal * (item.discount / 100)
    const taxableAmount = subtotal - discountAmount
    const taxAmount = taxableAmount * (item.tax / 100)
    updated[index].total = taxableAmount + taxAmount
    
    setItems(updated)
  }

  const deleteItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const totalDiscount = (subtotal * (globalDiscount / 100)) + items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unitPrice
    return sum + (itemSubtotal * (item.discount / 100))
  }, 0)
  const taxableAmount = subtotal - totalDiscount
  const totalTax = taxableAmount * 0.15
  const total = taxableAmount + totalTax

  const handleSave = async (isDraft: boolean) => {
    const token = localStorage.getItem('accessToken')
    if (!token || selectedCompany === 'all' || !selectedClient) {
      alert('Complete todos los campos requeridos')
      return
    }

    try {
      const quoteNumber = `COT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
      
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteNumber,
          companyId: selectedCompany,
          clientId: selectedClient,
          currency,
          validUntil,
          notes: clientNotes,
          internalNotes,
          terms,
          items: items.filter(item => item.description.trim() !== '').map(item => ({
            productId: item.productId || undefined,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            tax: item.tax,
          })),
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert(isDraft ? 'Borrador guardado' : 'Cotización creada exitosamente')
        router.push('/clientes')
      } else {
        alert('Error al crear cotización')
      }
    } catch (error) {
      console.error('Error saving quote:', error)
      alert('Error al crear cotización')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <button onClick={() => router.push('/clientes')} className="hover:text-primary">CLIENTES</button>
            <span>&gt;</span>
            <button onClick={() => router.push('/clientes/multiagregado')} className="hover:text-primary">MULTIAGREGADO</button>
            <span>&gt;</span>
            <span className="text-primary font-medium">NUEVA COTIZACIÓN</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">Completa los detalles para generar una propuesta comercial.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push('/clientes')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            CANCELAR
          </Button>
          <Button variant="outline" onClick={() => handleSave(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            GUARDAR BORRADOR
          </Button>
          <Button onClick={() => handleSave(false)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            FINALIZAR
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">NOTAS PARA EL CLIENTE (VISIBLE EN PDF)</h3>
            <textarea
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Ej: Precios válidos por 15 días. Entrega inmediata."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">NOTAS INTERNAS (PRIVADO)</h3>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Ej: Precios válidos por 15 días. Entrega inmediata."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase w-12">#</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">PRODUCTO/SERVICIO</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase w-20">CANT.</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase w-28">PRECIO UNIT.</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase w-20">DESC. %</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase w-24">IMPUESTO</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase w-28">TOTAL</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.tempId} className="border-b border-gray-100">
                      <td className="py-2 px-2 text-sm text-gray-600">{index + 1}</td>
                      <td className="py-2 px-2">
                        <Input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder={index === items.length - 1 ? 'Producto...' : 'Descripción'}
                          fullWidth
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          fullWidth
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          placeholder="Precio..."
                          fullWidth
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          placeholder="0%"
                          fullWidth
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="text-sm text-primary font-medium">IVA 15%</span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <button onClick={() => deleteItem(index)} className="text-error hover:text-error-dark">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addItem} className="mt-4 text-primary hover:text-primary-dark font-medium flex items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar producto
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">SUBTOTAL</span>
                <span className="font-semibold text-gray-900">{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-lg text-green-600">
                <span className="font-medium">DESCUENTO TOTAL</span>
                <span className="font-semibold">-{totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">IVA (15%)</span>
                <span className="font-semibold text-gray-900">{totalTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-2xl pt-3 border-t border-gray-200">
                <span className="font-bold text-gray-900">TOTAL</span>
                <span className="font-bold text-gray-900">{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">DETALLES GENERALES</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCurrency('NIO')}
                    className={`px-4 py-2 rounded-lg font-medium ${currency === 'NIO' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    C$ NIO
                  </button>
                  <button
                    onClick={() => setCurrency('USD')}
                    className={`px-4 py-2 rounded-lg font-medium ${currency === 'USD' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    $ USD
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de emisión</label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} fullWidth />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} fullWidth />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
                <Select
                  options={[
                    { value: '', label: 'Seleccionar vendedor' },
                    { value: 'seller1', label: 'CARLOS MÉNDEZ' },
                  ]}
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                  fullWidth
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">TAB</kbd> Siguiente celda</span>
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">CNTRL + ALT + SUPR</kbd> Borrar fila</span>
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">ENTER</kbd> Confirmar</span>
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">↑</kbd> <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">↓</kbd> Navegar entre filas</span>
          </div>
        </div>
      </div>
    </div>
  )
}
