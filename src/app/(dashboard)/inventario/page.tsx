'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable, SkeletonKPI } from '@/components/ui-kit/Skeleton'
import { Input } from '@/components/ui-kit/Input'
import { Modal } from '@/components/ui-kit/Modal'
import { exportWithCompanyHeader } from '@/lib/export-utils'

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
  category: { name: string } | null
  company: { name: string } | null
}

interface Company {
  id: string
  name: string
  logo: string | null
}

const STOCK_TABS = [
  { id: 'all', label: 'TODOS LOS PRODUCTOS' },
  { id: 'high', label: 'MAYOR STOCK' },
  { id: 'low', label: 'MENOR STOCK' },
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
}

export default function InventarioPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{id: string, name: string} | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })
  const [savingCategory, setSavingCategory] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [selectedTab, setSelectedTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showFilters, setShowFilters] = useState(false)
  const [editingRows, setEditingRows] = useState<Record<string, EditingProduct>>({})
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({})
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([])

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
      },
    }))
  }

  const cancelEditing = (productId: string) => {
    setEditingRows(prev => { const n = { ...prev }; delete n[productId]; return n })
  }

  const saveEditing = async (productId: string) => {
    const row = editingRows[productId]
    if (!row) return
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setSavingRows(prev => ({ ...prev, [productId]: true }))
    try {
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

  const updateEditField = (productId: string, field: keyof EditingProduct, value: string) => {
    setEditingRows(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value }
    }))
  }

  const handleEditCategory = (cat: { id: string; name: string }) => {
    setEditingCategory(cat)
    setCategoryForm({ name: cat.name, description: '' })
    setShowCategoryModal(true)
  }

  const handleSaveCategory = async () => {
    if (!editingCategory || !categoryForm.name.trim()) return
    setSavingCategory(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/product-categories', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingCategory.id, name: categoryForm.name.trim() })
      })
      const data = await res.json()
      if (data.success) {
        setShowCategoryModal(false)
        fetchCategories()
      } else {
        alert(data.message || 'Error al editar categoría')
      }
    } catch (e) {
      alert('Error al editar categoría')
    } finally {
      setSavingCategory(false)
    }
  }

  const updateEditField = (productId: string, field: keyof EditingProduct, value: string) => {
    setEditingRows(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }))
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

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany)
      if (selectedTab !== 'all') params.append('stockFilter', selectedTab)
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
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany, selectedTab, searchTerm, currentPage, itemsPerPage])

  useEffect(() => {
    fetchCompanies()
    fetchCategories()
  }, [fetchCompanies, fetchCategories])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCompany, selectedTab, searchTerm])

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
    setShowFilters(true) // Open filters to show selectable stock range
  }

  const handleImportOrUpdate = () => {
    router.push('/inventario/edicion')
  }

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'PRODUCTO': 'Ejemplo Producto',
        'STOCK': 10,
        'CATEGORÍA': 'General',
        'DESC.': 'Descripción del producto',
        'SKU': 'SKU-001',
        'COSTO': 50.00,
        'PRECIO': 100.00,
        'MARGEN %': 50,
        'PROMO': ''
      }
    ]
    
    exportWithCompanyHeader(
      templateData,
      'plantilla_inventario.xlsx',
      'Plantilla de Importación de Inventario',
      companies,
      selectedCompany
    )
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Administra tu inventario de productos, visualice estados y gestiona contactos.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleMermas} className="h-10 text-orange-600 border-orange-200 hover:bg-orange-50">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Re-stock
          </Button>
          <Button variant="outline" onClick={handleDownloadTemplate} className="h-10">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Plantilla
          </Button>
          <Button variant="outline" onClick={handleExport} className="h-10">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar
          </Button>
          <Button variant="outline" onClick={() => { setEditingCategory({ id: '', name: '' }); setCategoryForm({ name: '', description: '' }); setShowCategoryModal(true); }} className="h-10">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.007M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Categorías
          </Button>
          <Button onClick={() => router.push('/inventario/edicion')} className="h-10 bg-blue-600 hover:bg-blue-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Producto
          </Button>
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
              <Select
                label="Categoría"
                options={[
                  { value: 'all', label: 'Todas' },
                  ...categories.map(c => ({ value: c.id, label: c.name }))
                ]}
                onChange={() => {}} // Integration with filter can be added here
                fullWidth
              />
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
                        <input type="number" value={editing.stock} onChange={e => updateEditField(product.id, 'stock', e.target.value)}
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-center" placeholder="0" />
                      </td>
                      <td className="py-2 px-2">
                        <div className="text-sm text-gray-500">{product.category?.name || '-'}</div>
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
                      <button onClick={() => startEditing(product)}
                        className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-opacity">
                        Editar
                      </button>
                    </td>
                  </tr>
)
      </div>

      {/* ModalEditarCategoría */}
      <Modal 
        isOpen={showCategoryModal} 
        onClose={() => setShowCategoryModal(false)}
        title="Editar Categoría"
      >
        <div className="space-y-4 p-4">
          <Input
            label="Nombre de categoría"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
            fullWidth
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory} disabled={savingCategory || !categoryForm.name.trim()}>
              {savingCategory ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
