'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input, Select, Button, ClientAutocomplete, ProductAutocomplete, UserAutocomplete } from '@/components/ui-kit'
import { useModulePermissions } from '@/hooks/useModulePermissions'

interface QuoteItem {
  tempId: number
  productId: string
  description: string
  sku?: string
  stock?: number | null
  quantity: number
  unitPrice: number | string
  discount: number | string
  tax: number
  total: number
  baseCost?: number
  basePublic?: number
  baseMin?: number
  baseDist?: number
}

interface Company {
  id: string
  name: string
  exchangeRate?: number
}

interface ClientOption {
  id: string
  name: string
}

interface InventoryProduct {
  id: string
  name: string
  sku: string
  price?: number
  publicPrice?: number
  minPrice?: number
  distributorPrice?: number
  cost?: number
  stock: number
  category?: { name: string }
}

function NuevaCotizacionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const permissions = useModulePermissions('cotizaciones')
  const inventarioPermissions = useModulePermissions('inventario')
  const prefillClientId = searchParams.get('clientId') || ''
  const prefillCompanyId = searchParams.get('companyId') || ''
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
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [seller, setSeller] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdminRole, setIsAdminRole] = useState(false)
  const [clientNotes, setClientNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [priceMode, setPriceMode] = useState<'PUB' | 'MIN' | 'DIS' | 'MARGIN'>('PUB')
  const [customMargin, setCustomMargin] = useState<number>(0)
  const [terms, setTerms] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([
    { tempId: 1, productId: '', description: '', sku: '', stock: null, quantity: '' as any, unitPrice: '', discount: '', tax: 15, total: 0 }
  ])

  // Safe array - always use this instead of items directly
  const itemsArray = useMemo(() => {
    if (!items || !Array.isArray(items)) return [{ tempId: 1, productId: '', description: '', sku: '', stock: null, quantity: '' as any, unitPrice: '', discount: '', tax: 15, total: 0 }]
    return items
  }, [items])

  const safeClients = Array.isArray(clients) ? clients : []
  const safeProducts = Array.isArray(products) ? products : []
  const [globalDiscount, setGlobalDiscount] = useState(0)

  const recalculateItemTotal = (item: QuoteItem, applyTax: boolean) => {
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice
    const discount = typeof item.discount === 'string' ? parseFloat(item.discount) || 0 : item.discount
    const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity
    const subtotalValue = qty * unitPrice
    const discountAmount = subtotalValue * (discount / 100)
    const taxableValue = subtotalValue - discountAmount
    const taxAmount = applyTax ? taxableValue * (item.tax / 100) : 0
    return taxableValue + taxAmount
  }

  const activeCompany = companies.find(c => c.id === selectedCompany)
  const exchangeRate = activeCompany?.exchangeRate || 36.62

  const formatCurrency = (val: number) => {
    if (currency === 'NIO') {
      return (val * exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })
    }
    return val.toLocaleString('en-US', { minimumFractionDigits: 2 })
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
        if (prefillCompanyId && companiesData.some((company: Company) => company.id === prefillCompanyId)) {
          setSelectedCompany(prefillCompanyId)
        } else if (activeCompany?.id) {
          setSelectedCompany(activeCompany.id)
        } else if (companiesData.length > 0) {
          setSelectedCompany(companiesData[0].id)
        }
      } catch (error) {
        console.error('Error fetching companies:', error)
      }
    }

    // Auto-fill seller with logged user
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    setCurrentUser(user)
    const role = user?.role || ''
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
    setIsAdminRole(isAdmin)
    
    // Set seller to current user if not admin
    if (!isAdmin && user?.id) {
      setSeller(user.id)
    }

    fetchCompanies()
  }, [prefillCompanyId])

useEffect(() => {
    if (selectedCompany === 'all') {
      setClients([])
      setSelectedClient('')
      setIsLoadingClients(false)
      return
    }

    // Solo cargar clientes si el usuario tiene permisos de cotizaciones (canCreate o canView)
    if (permissions.loading) {
      return
    }
    if (!permissions.canView && !permissions.canCreate) {
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
  }, [selectedCompany, permissions.loading, permissions.canView])

  useEffect(() => {
    if (!prefillClientId) return
    const exists = safeClients.some((client) => client.id === prefillClientId)
    if (exists && selectedClient !== prefillClientId) {
      setSelectedClient(prefillClientId)
    }
  }, [prefillClientId, safeClients, selectedClient])

  // Cargar productos del inventario cuando cambia la empresa
  useEffect(() => {
    if (selectedCompany === 'all') {
      setProducts([])
      return
    }

    // Solo cargar productos si el usuario tiene permisos de inventario
    if (inventarioPermissions.loading) {
      return
    }
    if (!inventarioPermissions.canView) {
      setProducts([])
      setIsLoadingProducts(false)
      return
    }

    const fetchProducts = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setIsLoadingProducts(false)
        return
      }

      try {
        const params = new URLSearchParams({ companyId: selectedCompany, limit: '10000' })
        const response = await fetch(`/api/products?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await response.json()
        if (data.success) {
          const list = Array.isArray(data.data) ? data.data : (data.data?.data ?? [])
          setProducts(Array.isArray(list) ? list : [])
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
  }, [selectedCompany, inventarioPermissions.loading, inventarioPermissions.canView])

  useEffect(() => {
    setItems((prev) => {
      const arr = Array.isArray(prev) ? prev : []
      return arr.map((item: any) => {
        let newUnitPrice = item.unitPrice
        if (item.productId) {
          if (priceMode === 'PUB') newUnitPrice = item.basePublic ?? item.unitPrice
          else if (priceMode === 'MIN') newUnitPrice = item.baseMin ?? item.unitPrice
          else if (priceMode === 'DIS') newUnitPrice = item.baseDist ?? item.unitPrice
          else if (priceMode === 'MARGIN') {
            const cost = item.baseCost ?? 0
            newUnitPrice = cost + (cost * (customMargin / 100))
          }
        }
        return {
          ...item,
          unitPrice: newUnitPrice,
          total: recalculateItemTotal({ ...item, unitPrice: newUnitPrice }, taxApplies),
        }
      })
    })
  }, [taxApplies, priceMode, customMargin])

  const addItem = () => {
    const newTempId = itemsArray.length > 0 ? Math.max(...itemsArray.map(i => i.tempId)) + 1 : 1
    setItems([...itemsArray, {
      tempId: newTempId,
      productId: '',
      description: '',
      sku: '',
      stock: null,
      quantity: '' as any,
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
    if (field === 'description') {
      updated[index].productId = ''
      updated[index].sku = ''
      updated[index].stock = null
    }
    updated[index].total = recalculateItemTotal(updated[index], taxApplies)
    setItems(updated)
  }

  const selectProduct = (index: number, product: any) => {
    if (!product) return
    const updated = [...itemsArray]
    const baseCost = product.cost || 0
    const basePublic = product.publicPrice || product.price || 0
    const baseMin = product.minPrice || product.price || 0
    const baseDist = product.distributorPrice || product.price || 0
    
    let initialUnitPrice = basePublic
    if (priceMode === 'MIN') initialUnitPrice = baseMin
    if (priceMode === 'DIS') initialUnitPrice = baseDist
    if (priceMode === 'MARGIN') initialUnitPrice = baseCost + (baseCost * (customMargin / 100))

    const currentQty = typeof updated[index].quantity === 'string' ? parseFloat(updated[index].quantity as string) || 0 : updated[index].quantity
    const newQty = currentQty < 1 ? 1 : currentQty

    updated[index] = {
      ...updated[index],
      productId: product.id,
      description: product.name,
      sku: product.sku || '',
      stock: typeof product.stock === 'number' ? product.stock : null,
      quantity: newQty,
      unitPrice: initialUnitPrice,
      baseCost,
      basePublic,
      baseMin,
      baseDist,
    }
    updated[index].total = recalculateItemTotal(updated[index], taxApplies)
    setItems(updated)
  }

  const deleteItem = (index: number) => {
    if (itemsArray.length > 1) {
      setItems(itemsArray.filter((_, i) => i !== index))
    } else {
      setItems([{
        tempId: itemsArray[0].tempId,
        productId: '',
        description: '',
        sku: '',
        stock: null,
        quantity: '' as any,
        unitPrice: '',
        discount: '',
        tax: 15,
        total: 0
      }])
    }
  }

  const subtotal = itemsArray.reduce((sum: number, item: any) => {
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice
    const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity
    return sum + (qty * unitPrice)
  }, 0)
  const totalDiscount = (subtotal * (globalDiscount / 100)) + itemsArray.reduce((sum: number, item: any) => {
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice
    const discount = typeof item.discount === 'string' ? parseFloat(item.discount) || 0 : item.discount
    const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity
    const itemSubtotal = qty * unitPrice
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
            quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity,
            unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice,
            discount: typeof item.discount === 'string' ? parseFloat(item.discount) || 0 : item.discount,
            tax: item.tax,
          })),
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert(isDraft ? 'Borrador guardado' : 'Cotización creada exitosamente')
        router.push(`/clientes/cotizacion/${data.data.id}`)
      } else {
        alert('Error al crear cotización')
      }
    } catch (error) {
      console.error('Error saving quote:', error)
      alert('Error al crear cotización')
    }
  }

  if (!permissions.loading && !permissions.canCreate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center rounded-full mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sin permisos</h1>
        <p className="text-gray-500 mb-6 max-w-md">
          No tienes permisos para crear cotizaciones. Contacta al administrador para que te asigne el permiso de &quot;Crear&quot; en el módulo de Cotizaciones.
        </p>
        <button
          onClick={() => router.push('/clientes/cotizacion')}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Volver a Cotizaciones
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <button onClick={() => router.push('/clientes/cotizacion')} className="hover:text-primary">COTIZACIONES</button>
            <span>&gt;</span>
            <span className="text-primary font-medium">NUEVA COTIZACIÓN</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva Cotización</h1>
          <p className="text-sm text-gray-500 mt-1">Completa los detalles para generar una propuesta comercial.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push('/clientes/cotizacion')}>
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
            <div className="overflow-x-auto w-full">
              <table className="w-full table-fixed min-w-[1000px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
                    <th className="text-left py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[300px]">PRODUCTO/SERVICIO</th>
                    <th className="text-center py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 min-w-[120px]">CANT.</th>
                    <th className="text-right py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 min-w-[150px]">PRECIO UNIT.</th>
                    <th className="text-right py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 min-w-[120px]">DESC. %</th>
                    <th className="text-center py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">IMPUESTO</th>
                    <th className="text-right py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 min-w-[150px]">TOTAL</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {itemsArray.map((item: any, index: number) => {
                    const selectedProduct = safeProducts.find((product) => product.id === item.productId)
                    const skuToShow = item.sku || selectedProduct?.sku || ''
                    const stockToShow = typeof item.stock === 'number' ? item.stock : selectedProduct?.stock
                    return (
                    <tr key={item.tempId} className="border-b border-gray-100">
                      <td className="py-2 px-2 text-sm text-gray-600">{index + 1}</td>
                      <td className="py-3 px-2">
                        <div className="space-y-2">
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
                                  const updated = [...itemsArray]
                                  updated[index] = {
                                    ...updated[index],
                                    productId: '',
                                    description: '',
                                    sku: '',
                                    stock: null,
                                    unitPrice: '',
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
                              className="mb-1 w-full"
                              inputClassName="text-sm font-semibold"
                              dropdownClassName="w-[min(1100px,95vw)] max-h-[420px]"
                            />
                          )}
                          {skuToShow ? (
                            <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-2">
                              <span className="uppercase tracking-wide">SKU:</span>
                              <span className="font-mono text-slate-700">{skuToShow}</span>
                              {typeof stockToShow === 'number' && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stockToShow > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                  Stock {stockToShow}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value))}
                          fullWidth
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={item.unitPrice === '' ? '' : currency === 'NIO' ? (Number(item.unitPrice) * exchangeRate).toFixed(2) : item.unitPrice}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            if (isNaN(val)) {
                              updateItem(index, 'unitPrice', '')
                            } else {
                              updateItem(index, 'unitPrice', currency === 'NIO' ? val / exchangeRate : val)
                            }
                          }}
                          placeholder="Precio..."
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
                          placeholder="0%"
                          fullWidth
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="text-sm text-primary font-medium">{taxApplies ? 'IVA 15%' : 'NO APLICA IVA'}</span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.total)}
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
                    )
                  })}
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
                <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-lg text-green-600">
                <span className="font-medium">DESCUENTO TOTAL</span>
                <span className="font-semibold">-{formatCurrency(totalDiscount)}</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">{taxApplies ? 'IVA (15%)' : 'IVA (NO APLICA)'}</span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalTax)}</span>
              </div>
              <div className="flex items-center justify-between text-2xl pt-3 border-t border-gray-200">
                <span className="font-bold text-gray-900">TOTAL</span>
                <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Modo de Precio</label>
                <Select
                  options={[
                    { value: 'PUB', label: 'Precio Público (PUB)' },
                    { value: 'MIN', label: 'Precio Mínimo (MIN)' },
                    { value: 'DIS', label: 'Precio Distribuidor (DIS)' },
                    { value: 'MARGIN', label: 'Margen Personalizado (%)' },
                  ]}
                  value={priceMode}
                  onChange={(e) => setPriceMode(e.target.value as any)}
                  fullWidth
                />
              </div>
              {priceMode === 'MARGIN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje de Margen (%)</label>
                  <Input
                    type="number"
                    min="0"
                    value={customMargin}
                    onChange={(e) => setCustomMargin(parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }}
                    fullWidth
                    placeholder="Ej: 20"
                  />
                </div>
              )}
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
                {isAdminRole ? (
                  <UserAutocomplete
                    label="Vendedor"
                    companyId={selectedCompany}
                    value={seller}
                    onChange={(val) => setSeller(val)}
                    fullWidth
                  />
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
                    <input
                      type="text"
                      value={currentUser?.name || 'Usuario actual'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                )}
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

export default function NuevaCotizacionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-gray-500">Cargando...</div></div>}>
      <NuevaCotizacionContent />
    </Suspense>
  )
}
