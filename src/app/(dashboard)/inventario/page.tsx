'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui-kit/Card'
import { Select } from '@/components/ui-kit/Select'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'
import { SkeletonTable, SkeletonKPI } from '@/components/ui-kit/Skeleton'
import { Input } from '@/components/ui-kit/Input'

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
  }, [fetchCompanies])

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
  }

  const handleImportOrUpdate = () => {
    router.push('/inventario/edicion')
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
          <Button variant="outline" onClick={handleMermas} className="h-10">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Mermas
          </Button>
          <Button variant="outline" onClick={handleImportOrUpdate} className="h-10">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Importar/Actualizar
          </Button>
          <Button onClick={() => router.push('/inventario/edicion')} className="h-10">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar
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
            placeholder="Buscar cliente, toneo..."
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
    </div>
  )
}
