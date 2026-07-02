'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable, SkeletonKPI } from '@/components/ui-kit/Skeleton'
import { Input } from '@/components/ui-kit/Input'
import { exportWithCompanyHeader } from '@/lib/export-utils'
import { useModulePermissions } from '@/hooks/useModulePermissions'
import { EditProductModal } from '@/components/inventory/EditProductModal'

interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  stock: number
  cost: number
  price: number
  netMargin: number | null
  promotion: string | null
  promotionCost: number | null
  promotionDiscount: number | null
  category: { id: string; name: string } | null
  company: { name: string } | null
}

interface Company {
  id: string
  name: string
  logo: string | null
}

interface InventorySummary {
  totalProducts: number
  totalStock: number
  lowStockProducts: number
  inventoryValue: number
}

const STOCK_TABS = [
  { id: 'all', label: 'TODOS LOS PRODUCTOS' },
  { id: 'high', label: 'MAYOR STOCK' },
  { id: 'low', label: 'MENOR STOCK' },
]

const CATEGORY_TABS = [
  { id: 'all', label: 'TODOS PRODUCTOS/SERVICIOS' },
  { id: 'product', label: 'PRODUCTOS' },
  { id: 'service', label: 'SERVICIOS' },
]

interface EditingProduct {
  name: string
  sku: string
  description: string
  stock: string
  cost: string
  price: string
  netMargin: string
  promotion: string
  promotionCost: string
  promotionDiscount: string
  categoryId: string
  categoryName: string
}

function InventarioPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const permissions = useModulePermissions('inventario', { requireAction: 'view' })
  const [products, setProducts] = useState<Product[]>([])
  const [summary, setSummary] = useState<InventorySummary>({
    totalProducts: 0,
    totalStock: 0,
    lowStockProducts: 0,
    inventoryValue: 0,
  })
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedTab, setSelectedTab] = useState('all')
  const [categoryType, setCategoryType] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showFilters, setShowFilters] = useState(false)
  const [showFlowGuide, setShowFlowGuide] = useState(false)
  const [editingRows, setEditingRows] = useState<Record<string, EditingProduct>>({})
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({})
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([])
  const [showImportModal, setShowImportModal] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const normalizeCategoryName = (value: string) =>
    value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const getStockTone = (stock: number) => {
    if (stock <= 10) {
      return {
        label: 'Crítico',
        pill: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
        card: 'border-rose-200 bg-rose-50/60',
        dot: 'bg-rose-500',
      }
    }
    if (stock <= 20) {
      return {
        label: 'Bajo',
        pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        card: 'border-amber-200 bg-amber-50/60',
        dot: 'bg-amber-500',
      }
    }
    return {
      label: 'OK',
      pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      card: 'border-emerald-200 bg-emerald-50/60',
      dot: 'bg-emerald-500',
    }
  }

  const productTiles = useMemo(() => {
    const accents = [
      'from-sky-500 to-cyan-400',
      'from-indigo-500 to-violet-400',
      'from-emerald-500 to-teal-400',
      'from-amber-500 to-orange-400',
      'from-fuchsia-500 to-pink-400',
      'from-slate-700 to-slate-500',
    ]

    return products.map((product, index) => ({
      ...product,
      accent: accents[index % accents.length],
      stockTone: getStockTone(product.stock),
      initials: product.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'PR',
    }))
  }, [products])

  const startEditing = (product: Product) => {
    setEditingRows(prev => ({
      ...prev,
      [product.id]: {
        name: product.name,
        sku: product.sku,
        description: product.description || '',
        stock: String(product.stock),
        cost: String(product.cost),
        price: String(product.price),
        netMargin: product.netMargin != null ? String(product.netMargin) : '',
        promotion: product.promotion || '',
        promotionCost: product.promotionCost != null ? String(product.promotionCost) : '',
        promotionDiscount: product.promotionDiscount != null ? String(product.promotionDiscount) : '',
        categoryId: product.category?.id || '',
        categoryName: product.category?.name || '',
      },
    }))
  }

  const cancelEditing = (productId: string) => {
    setEditingRows(prev => { const n = { ...prev }; delete n[productId]; return n })
  }

  const saveEditing = async (productId: string) => {
    const row = editingRows[productId]
    if (!row) return
    
    const parsedCost = parseFloat(row.cost) || 0;
    const parsedPrice = parseFloat(row.price) || 0;
    if (parsedPrice < parsedCost) {
      alert('El precio de venta no puede ser menor al costo');
      return;
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return
    setSavingRows(prev => ({ ...prev, [productId]: true }))
    try {
      let resolvedCategoryId = row.categoryId || ''
      const typedCategoryName = (row.categoryName || '').trim()

      if (typedCategoryName) {
        const matchedCategory = categories.find(
          (cat) =>
            cat.id === typedCategoryName ||
            normalizeCategoryName(cat.name) === normalizeCategoryName(typedCategoryName)
        )

        if (matchedCategory) {
          resolvedCategoryId = matchedCategory.id
        } else {
          if (selectedCompany === 'all') {
            alert('Selecciona una empresa para crear una nueva categoría')
            return
          }

          const createCategoryRes = await fetch('/api/product-categories', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: typedCategoryName,
              companyId: selectedCompany,
            }),
          })

          const createCategoryData = await createCategoryRes.json()
          if (!createCategoryData.success) {
            alert(createCategoryData.error || 'Error al crear categoría')
            return
          }

          const createdCategory = createCategoryData.data
          resolvedCategoryId = createdCategory.id
          setCategories(prev => [...prev, createdCategory])
        }
      } else {
        resolvedCategoryId = ''
      }

      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: row.name,
          sku: row.sku,
          description: row.description || null,
          stock: Number(row.stock) || 0,
          cost: Number(row.cost) || 0,
          price: Number(row.price) || 0,
          netMargin: row.netMargin !== '' ? Number(row.netMargin) : null,
          promotion: row.promotion || null,
          promotionCost: row.promotionCost !== '' ? Number(row.promotionCost) : null,
          promotionDiscount: row.promotionDiscount !== '' ? Number(row.promotionDiscount) : null,
          categoryId: resolvedCategoryId || null,
        }),
      })
      if (res.ok) {
        cancelEditing(productId)
        fetchData()
      } else {
        alert('Error al guardar cambios')
      }
    } catch {
      alert('Error al guardar cambios')
    } finally {
      setSavingRows(prev => { const n = { ...prev }; delete n[productId]; return n })
    }
  }

  const updateEditField = (productId: string, field: string, value: string) => {
    setEditingRows(prev => {
      const updated = { ...prev[productId], [field]: value }

      if (field === 'categoryName') {
        const matchedCategory = categories.find(
          (cat) =>
            cat.id === value ||
            normalizeCategoryName(cat.name) === normalizeCategoryName(value)
        )
        updated.categoryId = matchedCategory?.id || ''
      }
      
      // Auto-calculate margin when cost or price changes
      if (field === 'cost' || field === 'price') {
        const cost = field === 'cost' ? parseFloat(value) || 0 : parseFloat(updated.cost) || 0
        const price = field === 'price' ? parseFloat(value) || 0 : parseFloat(updated.price) || 0
        if (cost > 0) {
          const margin = ((price - cost) / cost) * 100
          updated.netMargin = (Math.round(margin * 100) / 100).toString()
        }
      }
      
      return { ...prev, [productId]: updated }
    })
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
  }

  const closeEditModal = () => {
    setEditingProduct(null)
  }

  const fetchCompanies = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch('/api/companies', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setCompanies(data.data)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const res = await fetch('/api/product-categories', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setCategories(data.data)
    } catch (e) {
      console.error('Error fetching categories:', e)
    }
  }, [])

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Ingresa un nombre para la categoría')
      return
    }
    if (selectedCompany === 'all') {
      alert('Selecciona una empresa primero')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch('/api/product-categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          companyId: selectedCompany
        })
      })

      const data = await response.json()
      if (data.success) {
        setCategories(prev => [...prev, data.data])
        setNewCategoryName('')
        alert('Categoría creada exitosamente')
      } else {
        alert(data.error || 'Error al crear categoría')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Error al crear categoría')
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`¿Eliminar categoría "${categoryName}"? Los productos quedarán sin categoría.`)) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const response = await fetch('/api/product-categories', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: categoryId }),
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.error || 'No se pudo eliminar la categoría')
        return
      }

      setCategories((prev) => prev.filter((category) => category.id !== categoryId))
      fetchData()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Error al eliminar categoría')
    }
  }

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (selectedTab !== 'all') params.append('stockFilter', selectedTab)
      if (categoryType !== 'all') params.append('categoryType', categoryType)
      if (searchTerm.trim()) params.append('search', searchTerm.trim())
      params.append('page', currentPage.toString())
      params.append('limit', itemsPerPage.toString())

      const response = await fetch(`/api/products?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setProducts(data.data.data || [])
        setTotalItems(data.data.pagination?.total || 0)
        setTotalPages(data.data.pagination?.totalPages || 1)
        setSummary({
          totalProducts: data.data.summary?.totalProducts ?? data.data.pagination?.total ?? 0,
          totalStock: data.data.summary?.totalStock ?? 0,
          lowStockProducts: data.data.summary?.lowStockProducts ?? 0,
          inventoryValue: data.data.summary?.inventoryValue ?? 0,
        })
        
        const editId = searchParams?.get('edit')
        if (editId) {
          let productToEdit = (data.data.data || []).find((p: Product) => p.id === editId)

          if (!productToEdit) {
            try {
              const res = await fetch(`/api/products/${editId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              const pData = await res.json()
              if (pData.success && pData.data) {
                productToEdit = pData.data
                setProducts(prev => {
                  const exists = prev.some(p => p.id === editId)
                  return exists ? prev : [productToEdit, ...prev]
                })
              }
            } catch (e) {
              console.error('Error fetching specific product to edit:', e)
            }
          }

          if (productToEdit) {
            setEditingProduct(productToEdit)
            // Clear URL params so it doesn't re-trigger after a save re-fetch
            router.replace(window.location.pathname, { scroll: false })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany, selectedTab, categoryType, searchTerm, currentPage, itemsPerPage])

  useEffect(() => {
    fetchCompanies()
    fetchCategories()
  }, [fetchCompanies, fetchCategories])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCompany, selectedTab, categoryType, searchTerm])

  const showingFrom = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const showingTo = totalItems === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalItems)

  const visiblePages = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)

    const pages = new Set<number>([1, totalPages])
    pages.add(currentPage)
    if (currentPage - 1 > 1) pages.add(currentPage - 1)
    if (currentPage + 1 < totalPages) pages.add(currentPage + 1)

    return Array.from(pages).sort((a, b) => a - b)
  })()

  const handleMermas = () => {
    setSelectedTab('low')
  }

  const handleFlowGuide = () => {
    setShowFlowGuide(true)
  }

  const handleImportOrUpdate = () => {
    setShowImportModal(true)
  }

  const handleDownloadTemplate = async () => {
    const templateData = [
      {
        'PRODUCTO': 'Ejemplo Producto',
        'STOCK': 10,
        'CATEGORÍA': 'General',
        'DESC.': 'Descripción del producto',
        'SKU': 'SKU-001',
        'COSTO': 50.00,
        'PRECIO': 100.00,
        'MARGEN %': 50
      }
    ]
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
    XLSX.writeFile(wb, 'plantilla_inventario.xlsx')
  }

  
  const handleExport = () => {
    if (!products.length) {
      alert('No hay productos para exportar')
      return
    }

    const dataToExport = products.map(p => ({
      'PRODUCTO': p.name,
      'STOCK': p.stock,
      'CATEGORÍA': p.category?.name || 'Sin categoría',
      'DESC.': p.description || '',
      'SKU': p.sku,
      'COSTO': p.cost,
      'PRECIO': p.price,
      'MARGEN %': p.netMargin != null ? `${p.netMargin.toFixed(2)}%` : '-',
      'PROMO': p.promotion || ''
    }))

    exportWithCompanyHeader(
      dataToExport,
      `inventario_${new Date().toISOString().split('T')[0]}.xlsx`,
      'Reporte de Inventario',
      companies,
      selectedCompany
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonKPI />
          <SkeletonKPI />
          <SkeletonKPI />
        </div>
        <SkeletonTable rows={10} columns={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-2xl shadow-slate-200/50">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/80">
              Centro de inventario
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Inventario</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
                KPIs arriba, filtros en pills y vista de cuadrícula o tabla sin tocar la lógica de negocio.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {permissions.canEdit && (
              <Button variant="outline" onClick={handleMermas} className="h-10 border-white/20 bg-white/5 text-white hover:bg-white/10">
                Re-stock
              </Button>
            )}
            <Button variant="outline" onClick={handleFlowGuide} className="h-10 border-cyan-200/30 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/20">
              Cómo funciona
            </Button>
            {permissions.canEdit && (
              <Button variant="outline" onClick={() => setShowImportModal(true)} className="h-10 border-white/20 bg-white/5 text-white hover:bg-white/10">
                Importar
              </Button>
            )}
            {permissions.canExport && (
              <Button variant="outline" onClick={handleExport} className="h-10 border-white/20 bg-white/5 text-white hover:bg-white/10">
                Exportar
              </Button>
            )}
            {permissions.canCreate && (
              <>
                <Button onClick={() => router.push('/inventario/edicion?type=PRODUCTO')} className="h-10 bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                  Agregar Producto
                </Button>
                <Button onClick={() => router.push('/inventario/edicion?type=SERVICIO')} variant="outline" className="h-10 border-white/20 bg-white/5 text-white hover:bg-white/10">
                  Agregar Servicio
                </Button>
              </>
            )}
          </div>
        </div>
        {/* Input de archivo oculto para importar */}
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              const reader = new FileReader()
              reader.onload = (evt) => {
                sessionStorage.setItem('pendingImportFile', JSON.stringify({
                  name: file.name,
                  type: file.type,
                  data: evt.target?.result
                }))
                router.push('/inventario/edicion?import=1')
              }
              reader.readAsDataURL(file)
            }
            e.target.value = ''
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Total productos</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-black text-slate-900">{summary.totalProducts.toLocaleString('es-NI')}</p>
              <p className="text-sm text-slate-500">Registrados en el sistema</p>
            </div>
            <div className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">SKU / stock</div>
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-rose-500">Stock bajo</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-black text-rose-700">{summary.lowStockProducts.toLocaleString('es-NI')}</p>
              <p className="text-sm text-rose-700/80">Productos críticos o bajos</p>
            </div>
            <div className="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-bold text-white">Alertas</div>
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-600">Valor inventario</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-black text-emerald-800">$ {formatCurrency(summary.inventoryValue)}</p>
              <p className="text-sm text-emerald-800/80">Stock x costo</p>
            </div>
            <div className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Valor</div>
          </div>
        </Card>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {STOCK_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryType(tab.id)}
                className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-colors ${
                  categoryType === tab.id
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {permissions.canEdit && (
              <Button variant="outline" onClick={() => setShowCategoryModal(true)} className="h-10 rounded-full border-slate-200">
                + Categoría
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                  viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Cuadrícula
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                  viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Tabla
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-xs">
            <Select
              options={[
                { value: 'all', label: 'TODAS LAS EMPRESAS' },
                ...companies.map((company) => ({ value: company.id, label: company.name })),
              ]}
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full lg:max-w-md">
            <Input
              type="text"
              placeholder="Buscar producto, categoría o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
            />
          </div>
        </div>

        <div className="mt-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {productTiles.map((product) => (
                <div key={product.id} className={`overflow-hidden rounded-3xl border p-5 shadow-sm ${product.stockTone.card}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${product.accent} text-lg font-black text-white shadow-lg`}>
                      {product.initials}
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${product.stockTone.pill}`}>
                        {product.stockTone.label}
                      </span>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400">{product.sku}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-black text-slate-900">{product.name}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600 line-clamp-2">
                      {product.description || 'Sin descripción'}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-600">
                      {product.category?.name || 'Sin categoría'}
                    </span>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-600">
                      Stock {product.stock}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-white/80 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Costo</p>
                      <p className="mt-1 text-sm font-black text-slate-900">$ {formatCurrency(product.cost)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Precio</p>
                      <p className="mt-1 text-sm font-black text-slate-900">$ {formatCurrency(product.price)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Margen</p>
                      <p className="mt-1 text-sm font-black text-slate-900">
                        {product.netMargin != null ? `${product.netMargin.toFixed(2)}%` : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {permissions.canEdit ? (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => openEditModal(product)}
                      >
                        Editar
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedTab('low')}
                    >
                      Ver alertas
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Producto</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Stock</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">SKU</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Costo</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Precio</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Margen</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => {
                    const tone = getStockTone(product.stock)
                    return (
                      <tr key={product.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500 line-clamp-1">{product.description || 'Sin descripción'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${tone.pill}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">{product.category?.name || 'Sin categoría'}</td>
                        <td className="px-4 py-4 text-sm font-mono text-slate-500">{product.sku}</td>
                        <td className="px-4 py-4 text-right text-sm font-medium text-slate-700">$ {formatCurrency(product.cost)}</td>
                        <td className="px-4 py-4 text-right text-sm font-medium text-slate-900">$ {formatCurrency(product.price)}</td>
                        <td className="px-4 py-4 text-right text-sm font-medium text-slate-900">
                          {product.netMargin != null ? `${product.netMargin.toFixed(2)}%` : '-'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {permissions.canEdit ? (
                            <Button variant="outline" className="h-9" onClick={() => openEditModal(product)}>
                              Editar
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {products.length === 0 && (
            <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50">
              <div className="text-center">
                <p className="text-lg font-black text-slate-900">Sin productos</p>
                <p className="mt-1 text-sm text-slate-500">No se encontraron resultados con los filtros actuales.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <div>
            Mostrando {showingFrom} a {showingTo} de {totalItems} resultados
          </div>
          <div className="flex items-center gap-2">
            <span>Por página:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="75">75</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          {visiblePages.map((page, index) => {
            const previousPage = visiblePages[index - 1]
            const hasGap = previousPage && page - previousPage > 1

            return (
              <div key={page} className="flex items-center gap-2">
                {hasGap && <span className="text-slate-400">...</span>}
                <button
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 w-9 rounded-xl text-sm font-bold ${
                    currentPage === page ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              </div>
            )
          })}
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </Button>
        </div>
      </div>

      {showFlowGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Cómo funciona el nuevo inventario</h2>
                <p className="mt-1 text-sm text-slate-500">Guía rápida de flujo y lógica sin tocar la regla de negocio actual.</p>
              </div>
              <button onClick={() => setShowFlowGuide(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                ✕
              </button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">1. Lectura rápida</p>
                <p className="mt-2 text-sm text-slate-700">
                  KPIs arriba para ver total de productos, stock bajo y valor inventario sin entrar a listas largas.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">2. Filtros rápidos</p>
                <p className="mt-2 text-sm text-slate-700">
                  Pills horizontales para cambiar entre stock crítico, stock bajo y categoría sin abrir selects pesados.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">3. Vista visual</p>
                <p className="mt-2 text-sm text-slate-700">
                  La cuadrícula prioriza lectura visual. Como el modelo no guarda imagen de producto, usa un tile visual consistente; si luego agregas `imageUrl`, se enchufa aquí.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">4. Lógica intacta</p>
                <p className="mt-2 text-sm text-slate-700">
                  Crear, editar, exportar y mover a re-stock sigue usando los mismos endpoints y la misma validación. Solo cambia la presentación.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
              <Button variant="outline" onClick={() => setShowFlowGuide(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Importar Inventario</h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                <h4 className="font-bold mb-2">📋 Instrucciones de Importación</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Descarga la plantilla de ejemplo.</li>
                  <li>La plantilla contiene solo las columnas necesarias. <strong>No agregues filas ni columnas extra arriba de los encabezados.</strong></li>
                  <li>Llena los datos respetando los nombres de las columnas.</li>
                  <li>Sube el archivo finalizado aquí.</li>
                </ul>
              </div>

              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full border-slate-200">
                Descargar Plantilla
              </Button>

              <div className="mt-4 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-cyan-500 transition-colors">
                <div onClick={() => importInputRef.current?.click()} className="cursor-pointer">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-600 mb-3">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-slate-700">Haz clic para subir tu archivo</p>
                  <p className="text-xs text-slate-500 mt-1">Solo archivos .xlsx, .xls o .csv</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowImportModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      <EditProductModal
        product={editingProduct}
        onClose={closeEditModal}
        onSaved={fetchData}
      />

    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Administra tu inventario de productos, visualice estados y gestiona contactos.</p>
        </div>
        <div className="flex items-center gap-3">
          {permissions.canEdit && (
            <Button variant="outline" onClick={handleMermas} className="h-10 text-orange-600 border-orange-200 hover:bg-orange-50">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Re-stock
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadTemplate} className="h-10">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Plantilla
          </Button>
          {permissions.canExport && (
            <Button variant="outline" onClick={handleExport} className="h-10">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar
            </Button>
          )}
          {permissions.canCreate && (
            <>
              <Button onClick={() => router.push('/inventario/edicion?type=PRODUCTO')} className="h-10 bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Agregar Producto
              </Button>
              <Button onClick={() => router.push('/inventario/edicion?type=SERVICIO')} variant="outline" className="h-10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Agregar Servicio
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select
          options={[
            { value: 'all', label: 'TODAS LAS EMPRESAS' },
            ...companies.map((company) => ({ value: company.id, label: company.name })),
          ]}
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-56"
        />
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Buscar producto, categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
          />
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          {STOCK_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="h-6 w-px bg-gray-200" />
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryType(tab.id)}
              className={`px-3 py-2 rounded-full text-xs font-semibold tracking-wide transition-colors ${
                categoryType === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded transition-colors ${
                showFilters ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Filtros"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button 
              onClick={() => {
                setSelectedTab('all')
                setCategoryType('all')
                setSearchTerm('')
                setShowFilters(false)
              }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              title="Limpiar filtros"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Panel de filtros avanzados */}
        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                label="Rango de Stock"
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'low', label: 'Bajo Stock (<= 10)' },
                  { value: 'medium', label: 'Stock Medio (11-50)' },
                  { value: 'high', label: 'Stock Alto (> 50)' },
                ]}
                value={selectedTab === 'low' ? 'low' : 'all'} // Simple sync for low stock filter
                onChange={(e) => setSelectedTab(e.target.value)}
                fullWidth
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Categoría</label>
                <div className="flex gap-2">
                  <Select
                    options={[
                      { value: 'all', label: 'Todas' },
                      ...categories.map(c => ({ value: c.id, label: c.name }))
                    ]}
                    onChange={() => {}}
                    fullWidth
                  />
                  <Button
                    size="sm"
                    onClick={() => setShowCategoryModal(true)}
                    className="whitespace-nowrap"
                    title="Crear nueva categoría"
                  >
                    + Nueva
                  </Button>
                </div>
              </div>
              <Select
                label="Rango de Precio"
                options={[
                  { value: '0-50', label: '0$ - 50$' },
                  { value: '50-200', label: '50$ - 200$' },
                  { value: '200-500', label: '200$ - 500$' },
                  { value: '500+', label: '500$+' },
                ]}
                onChange={() => {}} // Placeholder for now
                fullWidth
              />
            </div>
            <div className="flex justify-end mt-3">
              <Button size="sm" onClick={() => setShowFilters(false)}>Aplicar Filtros</Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">PRODUCTO</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">STOCK</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">CATEGORÍA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">DESC.</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">COSTO</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">PRECIO</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">MARGEN %</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">PROMO</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const editing = editingRows[product.id]
                const saving = savingRows[product.id]
                if (editing) {
                  return (
                    <tr key={product.id} className="border-b border-blue-100 bg-blue-50/40">
                      <td className="py-2 px-2">
                        <input value={editing.name} onChange={e => updateEditField(product.id, 'name', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" placeholder="Nombre" />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" id={`stock-input-${product.id}`} value={editing.stock} onChange={e => updateEditField(product.id, 'stock', e.target.value)}
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-center transition-all duration-200" placeholder="0" />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          list={`category-options-${product.id}`}
                          value={editing.categoryName || ''}
                          onChange={e => updateEditField(product.id, 'categoryName', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          placeholder="Categoría..."
                        />
                        <datalist id={`category-options-${product.id}`}>
                          {categories.map(cat => <option key={cat.id} value={cat.name} />)}
                        </datalist>
                      </td>
                      <td className="py-2 px-2">
                        <input value={editing.description} onChange={e => updateEditField(product.id, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" placeholder="Descripción" />
                      </td>
                      <td className="py-2 px-2">
                        <input value={editing.sku} onChange={e => updateEditField(product.id, 'sku', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono" placeholder="SKU" />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" value={editing.cost} onChange={e => updateEditField(product.id, 'cost', e.target.value)}
                          className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm text-right" placeholder="0" />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" value={editing.price} onChange={e => updateEditField(product.id, 'price', e.target.value)}
                          className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm text-right" placeholder="0" />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" value={editing.netMargin} onChange={e => updateEditField(product.id, 'netMargin', e.target.value)}
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-right" placeholder="0" />
                      </td>
                      <td className="py-2 px-2">
                        <input value={editing.promotion} onChange={e => updateEditField(product.id, 'promotion', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" placeholder="Promo" />
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => saveEditing(product.id)} disabled={saving}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                            {saving ? '...' : 'Guardar'}
                          </button>
                          <button onClick={() => cancelEditing(product.id)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200">
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.stock > 100 ? 'bg-green-100 text-green-800' :
                        product.stock > 20 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">{product.category?.name || 'Sin categoría'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">{product.description || '-'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-mono text-gray-600">{product.sku}</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-sm text-gray-900">{product.cost} $</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-sm font-medium text-gray-900">{product.price} $</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {product.netMargin != null ? `${product.netMargin.toFixed(2)}%` : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">{product.promotion || '-'}</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {permissions.canEdit && (
                        <button onClick={() => startEditing(product)}
                          className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-opacity">
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron productos
          </div>
        )}
      </Card>


      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Mostrando {showingFrom} a {showingTo} de {totalItems} resultados
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Por página:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="75">75</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          {visiblePages.map((page, index) => {
            const previousPage = visiblePages[index - 1]
            const hasGap = previousPage && page - previousPage > 1

            return (
              <div key={page} className="flex items-center gap-2">
                {hasGap && <span className="text-gray-500">...</span>}
                <button
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded ${
                    currentPage === page ? 'bg-primary text-white' : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              </div>
            )
          })}
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </Button>
        </div>
      </div>




      {/* Modal de gestión de categorías */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Gestionar Categorías</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Nueva Categoría</label>
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ej: Electrónica, Alimentos, etc."
                    fullWidth
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCreateCategory()
                      }
                    }}
                  />
                  <Button onClick={handleCreateCategory} className="whitespace-nowrap">
                    Crear
                  </Button>
                </div>
              </div>

              {categories.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Categorías Existentes</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm text-gray-800">{cat.name}</span>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                          title="Eliminar categoría"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCategoryModal(false)
                  setNewCategoryName('')
                }} 
                className="flex-1"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de importación directa */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Importar Inventario desde Excel</h2>
              <p className="text-sm text-gray-500 mt-1">Selecciona un archivo .xlsx, .xls o .csv con tus productos.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  El archivo debe tener columnas como: <strong>PRODUCTO, SKU, STOCK, COSTO, PRECIO, CATEGORÍA</strong>.
                  Descarga la plantilla si no tienes el formato.
                </p>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary transition-colors">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600 mb-3">Selecciona tu archivo Excel</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  id="import-file-input-main"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (evt) => {
                        sessionStorage.setItem('pendingImportFile', JSON.stringify({
                          name: file.name,
                          type: file.type,
                          data: evt.target?.result
                        }))
                        setShowImportModal(false)
                        router.push('/inventario/edicion?import=1')
                      }
                      reader.readAsDataURL(file)
                    }
                    e.target.value = ''
                  }}
                />
                <label
                  htmlFor="import-file-input-main"
                  className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Seleccionar archivo
                </label>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Podrás revisar los productos antes de guardarlos definitivamente.
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <Button variant="outline" onClick={() => setShowImportModal(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InventarioPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <InventarioPageContent />
    </Suspense>
  )
}
