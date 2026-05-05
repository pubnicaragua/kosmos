'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Select, Button, ClientAutocomplete, ProductAutocomplete, UserAutocomplete } from '@/components/ui-kit'

interface QuoteItem {
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

interface InventoryProduct {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  category?: { name: string }
}

export default function NuevaCotizacionPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedClient, setSelectedClient] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [paymentMethod, setPaymentMethod] = useState<'CONTADO' | 'CREDITO'>('CONTADO')
  const [taxApplies, setTaxApplies] = useState(true)
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [seller, setSeller] = useState('')
  const [clientNotes, setClientNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([
    { tempId: 1, productId: '', description: '', quantity: 1, unitPrice: '', discount: '', tax: 15, total: 0 }
  ])

  // Safe array - always use this instead of items directly
  const itemsArray = useMemo(() => {
    if (!items || !Array.isArray(items)) return [{ tempId: 1, productId: '', description: '', quantity: 1, unitPrice: '', discount: '', tax: 15, total: 0 }]
    return items
  }, [items])

  const safeClients = Array.isArray(clients) ? clients : []
  const safeProducts = Array.isArray(products) ? products : []
  const [globalDiscount, setGlobalDiscount] = useState(0)

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
    const fetchCompanies = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      try {
        const response = await fetch('/api/companies', {
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await response.json()
        if (!data.success) return

        const companiesData = Array.isArray(data.data) ? data.data : []
        setCompanies(companiesData)

        const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
        if (activeCompany?.id) {
          setSelectedCompany(activeCompany.id)
        } else if (companiesData.length > 0) {
          setSelectedCompany(companiesData[0].id)
        }
      } catch (error) {
        console.error('Error fetching companies:', error)
      }
    }

    fetchCompanies()
  }, [])

useEffect(() => {
    if (selectedCompany === 'all') {
      setClients([])
      setSelectedClient('')
      setIsLoadingClients(false)
      return
    }

    setIsLoadingClients(true)
    const doFetch = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setClients([])
        setIsLoadingClients(false)
        return
      }
      try {
        const params = new URLSearchParams({ companyId: selectedCompany })
        const response = await fetch(`/api/clients?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          setClients(data.data)
          if (data.data.length > 0 && !selectedClient) {
            setSelectedClient(data.data[0].id)
          }
        } else {
          setClients([])
        }
      } catch (e) {
        console.error('Error fetching clients:', e)
        setClients([])
      } finally {
        setIsLoadingClients(false)
      }
    }
    doFetch()
  }, [selectedCompany])

  // Cargar productos del inventario cuando cambia la empresa
  useEffect(() => {
    if (selectedCompany === 'all') {
      setProducts([])
      return
    }

    const fetchProducts = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setIsLoadingProducts(false)
        return
      }

      try {
        const params = new URLSearchParams({ companyId: selectedCompany })
        const response = await fetch(`/api/products?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await response.json()
        if (data.success) {
          setProducts(Array.isArray(data.data) ? data.data : [])
        } else {
          setProducts([])
        }
      } catch (error) {
        console.error('Error fetching products:', error)
        setProducts([])
      } finally {
        setIsLoadingProducts(false)
      }
    }

    fetchProducts()
  }, [selectedCompany])

  useEffect(() => {
    setItems((prev) => {
      const arr = Array.isArray(prev) ? prev : []
      return arr.map((item: any) => ({
        ...item,
        total: recalculateItemTotal(item, taxApplies),
      }))
    })
  }, [taxApplies])

  const addItem = () => {
    const newTempId = itemsArray.length > 0 ? Math.max(...itemsArray.map(i => i.tempId)) + 1 : 1
    setItems([...itemsArray, {
      tempId: newTempId,
      productId: '',
      description: '',
      quantity: 1,
      unitPrice: '',
      discount: '',
      tax: 15,
      total: 0
    }])
  }

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const updated = [...itemsArray]
    
    // Validate stock when updating quantity
    if (field === 'quantity' && updated[index].productId) {
      const product = safeProducts.find((p: any) => p.id === updated[index].productId)
      if (product && product.stock !== undefined && product.stock < value) {
        alert(`Stock insuficiente. Disponible: ${product.stock}`)
        return
      }
    }
    
    updated[index] = { ...updated[index], [field]: value }
    updated[index].total = recalculateItemTotal(updated[index], taxApplies)
    setItems(updated)
  }

  const selectProduct = (index: number, product: any) => {
    if (!product) return
    const updated = [...itemsArray]
    const stockInfo = product.stock !== undefined ? (product.stock > 0 ? ` (Stock: ${product.stock})` : ' (Sin stock)') : ''
    updated[index] = {
      ...updated[index],
      productId: product.id,
      description: product.name + stockInfo,
      unitPrice: product.price || 0,
    }
    updated[index].total = recalculateItemTotal(updated[index], taxApplies)
    setItems(updated)
  }

  const deleteItem = (index: number) => {
    if (itemsArray.length > 1) {
      setItems(itemsArray.filter((_, i) => i !== index))
    }
  }

  const subtotal = itemsArray.reduce((sum: number, item: any) => {
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice
    return sum + (item.quantity * unitPrice)
  }, 0)
  const totalDiscount = (subtotal * (globalDiscount / 100)) + itemsArray.reduce((sum: number, item: any) => {
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice
    const discount = typeof item.discount === 'string' ? parseFloat(item.discount) || 0 : item.discount
    const itemSubtotal = item.quantity * unitPrice
    return sum + (itemSubtotal * (discount / 100))
  }, 0)
  const taxableAmount = subtotal - totalDiscount
  // Solo aplicar IVA si taxApplies es true
  const totalTax = taxApplies ? taxableAmount * 0.15 : 0
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
          paymentMethod,
          taxApplies,
          validUntil,
          notes: clientNotes,
          internalNotes,
          terms,
          items: itemsArray.filter((item: any) => item.description.trim() !== '').map((item: any) => ({
            productId: item.productId || undefined,
            description: item.description,
            quantity: item.quantity,
            unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice,
            discount: typeof item.discount === 'string' ? parseFloat(item.discount) || 0 : item.discount,
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
                    <th className="text-left py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
                    <th className="text-left py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">PRODUCTO/SERVICIO</th>
                    <th className="text-center py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">CANT.</th>
                    <th className="text-right py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">PRECIO UNIT.</th>
                    <th className="text-right py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">DESC. %</th>
                    <th className="text-center py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">IMPUESTO</th>
                    <th className="text-right py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-36">TOTAL</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {itemsArray.map((item: any, index: number) => (
                    <tr key={item.tempId} className="border-b border-gray-100">
                      <td className="py-2 px-2 text-sm text-gray-600">{index + 1}</td>
                      <td className="py-3 px-2">
                        <div className="space-y-2">
                          <ProductAutocomplete
                            companyId={selectedCompany}
                            value={item.description}
                            onChange={(val) => updateItem(index, 'description', val)}
                            onSelect={(prod) => selectProduct(index, prod as any)}
                            className="mb-1"
                          />
                        </div>
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
                        <span className="text-sm text-primary font-medium">{taxApplies ? 'IVA 15%' : 'NO APLICA IVA'}</span>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                <Select
                  options={[
                    { value: 'all', label: 'Seleccionar empresa' },
                    ...companies.map((company) => ({ value: company.id, label: company.name })),
                  ]}
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value)
                    setSelectedClient('')
                  }}
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Cliente</label>
                <ClientAutocomplete
                  companyId={selectedCompany}
                  value={selectedClient}
                  onChange={(id) => setSelectedClient(id)}
                  className="w-full"
                />
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('CONTADO')}
                    className={`px-4 py-2 rounded-lg font-medium ${paymentMethod === 'CONTADO' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Contado
                  </button>
                  <button
                    onClick={() => setPaymentMethod('CREDITO')}
                    className={`px-4 py-2 rounded-lg font-medium ${paymentMethod === 'CREDITO' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
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
                    taxApplies 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <span className={`font-medium ${taxApplies ? 'text-green-700' : 'text-gray-600'}`}>
                    {taxApplies ? 'SÍ APLICA IVA' : 'NO APLICA IVA'}
                  </span>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    taxApplies ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      taxApplies ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                </button>
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
                <UserAutocomplete
                  label="Vendedor"
                  companyId={selectedCompany}
                  value={seller}
                  onChange={(val) => setSeller(val)}
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
