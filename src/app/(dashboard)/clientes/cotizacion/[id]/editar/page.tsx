'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Select, Input, ProductAutocomplete } from '@/components/ui-kit'

interface QuoteItem {
  id?: string
  tempId: number
  productId: string
  description: string
  quantity: number
  unitPrice: number | string
  discount: number | string
  tax: number
  total: number
}

interface Company {
  id: string
  name: string
}

interface ClientOption {
  id: string
  name: string
}

export default function EditarCotizacionPage() {
  const router = useRouter()
  const params = useParams()
  const quoteId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [paymentMethod, setPaymentMethod] = useState<'CONTADO' | 'CREDITO'>('CONTADO')
  const [taxApplies, setTaxApplies] = useState(true)
  const [validUntil, setValidUntil] = useState('')
  const [clientNotes, setClientNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([])
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [quoteNumber, setQuoteNumber] = useState('')

  const recalculateItemTotal = (item: QuoteItem, applyTax: boolean) => {
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice
    const discount = typeof item.discount === 'string' ? parseFloat(item.discount) || 0 : item.discount
    const subtotalValue = item.quantity * unitPrice
    const discountAmount = subtotalValue * (discount / 100)
    const taxableValue = subtotalValue - discountAmount
    const taxAmount = applyTax ? taxableValue * (item.tax / 100) : 0
    return taxableValue + taxAmount
  }

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token || !quoteId) return

      try {
        const [companiesRes, quoteRes] = await Promise.all([
          fetch('/api/companies', { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/quotes/${quoteId}`, { headers: { Authorization: `Bearer ${token}` } }),
        ])

        const companiesData = await companiesRes.json()
        const quoteData = await quoteRes.json()

        if (companiesData.success) setCompanies(companiesData.data)

        if (quoteData.success) {
          const q = quoteData.data
          setQuoteNumber(q.quoteNumber)
          setSelectedCompany(q.companyId)
          setSelectedClient(q.clientId)
          setCurrency(q.currency)
          setPaymentMethod(q.paymentMethod)
          setTaxApplies(q.taxApplies)
          setValidUntil(q.validUntil ? new Date(q.validUntil).toISOString().split('T')[0] : '')
          setClientNotes(q.notes || '')
          // Strip audit marker from internalNotes
          const cleanNotes = (q.internalNotes || '').split('[DISCOUNT_APPROVAL_AUDIT]')[0].trim()
          setInternalNotes(cleanNotes)
          setTerms(q.terms || '')
          setItems(
            (q.items || []).map((item: any, idx: number) => ({
              id: item.id,
              tempId: idx + 1,
              productId: item.productId || '',
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              tax: item.tax,
              total: item.total,
            }))
          )
        }
      } catch (error) {
        console.error('Error loading quote:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [quoteId])

  useEffect(() => {
    if (!selectedCompany || selectedCompany === 'all') {
      setClients([])
      return
    }

    const fetchClients = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) return
      try {
        const res = await fetch(`/api/clients?companyId=${selectedCompany}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success) setClients(data.data)
      } catch (error) {
        console.error('Error fetching clients:', error)
      }
    }

    fetchClients()
  }, [selectedCompany])

  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, total: recalculateItemTotal(item, taxApplies) }))
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxApplies])

  const addItem = () => {
    setItems([...items, {
      tempId: Date.now(),
      productId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 15,
      total: 0,
    }])
  }

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'description') {
      updated[index].productId = ''
    }
    updated[index].total = recalculateItemTotal(updated[index], taxApplies)
    setItems(updated)
  }

  const selectProduct = (index: number, product: any) => {
    if (!product) return
    const updated = [...items]
    updated[index] = {
      ...updated[index],
      productId: product.id,
      description: product.name,
      unitPrice: product.price || 0,
    }
    updated[index].total = recalculateItemTotal(updated[index], taxApplies)
    setItems(updated)
  }

  const deleteItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => {
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice
    return sum + item.quantity * unitPrice
  }, 0)
  const totalDiscount =
    subtotal * (globalDiscount / 100) +
    items.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice
      const discount = typeof item.discount === 'string' ? parseFloat(item.discount) || 0 : item.discount
      return sum + item.quantity * unitPrice * (discount / 100)
    }, 0)
  const taxableAmount = subtotal - totalDiscount
  const totalTax = taxApplies ? taxableAmount * 0.15 : 0
  const total = taxableAmount + totalTax

  const handleSave = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !selectedClient) {
      alert('Complete todos los campos requeridos')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClient,
          currency,
          paymentMethod,
          taxApplies,
          validUntil,
          notes: clientNotes,
          internalNotes,
          terms,
          subtotal,
          discount: totalDiscount,
          tax: totalTax,
          total,
          items: items.map(i => ({
            productId: i.productId || null,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
            tax: i.tax,
            total: i.total
          }))
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Cotización actualizada exitosamente')
        router.push(`/clientes/cotizacion/${quoteId}`)
      } else {
        alert(data.error || 'Error al actualizar cotización')
      }
    } catch (error) {
      console.error('Error saving quote:', error)
      alert('Error al actualizar cotización')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando cotización...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <button onClick={() => router.push('/clientes')} className="hover:text-primary">CLIENTES</button>
            <span>&gt;</span>
            <button onClick={() => router.push(`/clientes/cotizacion/${quoteId}`)} className="hover:text-primary">
              COTIZACIÓN #{quoteNumber}
            </button>
            <span>&gt;</span>
            <span className="text-primary font-medium">EDITAR</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Editar Cotización</h1>
          <p className="text-sm text-gray-500 mt-1">Modifica los detalles de la cotización {quoteNumber}.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push(`/clientes/cotizacion/${quoteId}`)}>
            CANCELAR
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'GUARDAR CAMBIOS'}
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
              placeholder="Notas internas que no aparecen en el PDF..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">PRODUCTOS / SERVICIOS</h3>
            <div className="overflow-x-auto w-full">
              <table className="w-full table-fixed min-w-[1000px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase w-8">#</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">DESCRIPCIÓN</th>
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
                        {item.productId ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item.description}
                              readOnly
                              className="flex-1 px-3 py-2 text-sm font-semibold bg-gray-50 border border-gray-300 rounded-lg cursor-not-allowed text-gray-700"
                              title="Producto de inventario - no editable"
                            />
                            <button
                              onClick={() => {
                                const updated = [...items]
                                updated[index] = {
                                  ...updated[index],
                                  productId: '',
                                  description: '',
                                  unitPrice: 0,
                                }
                                setItems(updated)
                              }}
                              className="px-2 py-2 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                              title="Desvincular producto"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <ProductAutocomplete
                            companyId={selectedCompany}
                            value={item.description}
                            onChange={(val) => updateItem(index, 'description', val)}
                            onSelect={(prod) => selectProduct(index, prod as any)}
                            placeholder="Buscar producto o SKU..."
                            className="w-full"
                            inputClassName="text-sm font-semibold"
                          />
                        )}
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
                          fullWidth
                          readOnly={!!item.productId}
                          className={item.productId ? "bg-gray-50 cursor-not-allowed text-gray-600" : ""}
                          title={item.productId ? "El precio base del catálogo no se puede editar. Utiliza la columna de descuento." : ""}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          fullWidth
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="text-sm text-primary font-medium">{taxApplies ? 'IVA 15%' : 'NO IVA'}</span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <button onClick={() => deleteItem(index)} className="text-red-400 hover:text-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addItem} className="mt-4 text-primary hover:text-primary-dark font-medium flex items-center gap-1 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <span className="font-medium text-gray-700">{taxApplies ? 'IVA (15%)' : 'IVA (NO APLICA)'}</span>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <Select
                  options={[
                    { value: '', label: clients.length ? 'Seleccionar cliente' : 'Sin clientes' },
                    ...clients.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCurrency('NIO')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${currency === 'NIO' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    C$ NIO
                  </button>
                  <button
                    onClick={() => setCurrency('USD')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${currency === 'USD' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    $ USD
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('CONTADO')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${paymentMethod === 'CONTADO' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Contado
                  </button>
                  <button
                    onClick={() => setPaymentMethod('CREDITO')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${paymentMethod === 'CREDITO' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Crédito
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aplicar IVA</label>
                <button
                  onClick={() => setTaxApplies(!taxApplies)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors ${
                    taxApplies ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <span className={`font-medium text-sm ${taxApplies ? 'text-green-700' : 'text-gray-600'}`}>
                    {taxApplies ? 'SÍ APLICA IVA' : 'NO APLICA IVA'}
                  </span>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${taxApplies ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${taxApplies ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} fullWidth />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Términos y Condiciones</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Términos..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
