'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-kit/Button'
import { Select } from '@/components/ui-kit/Select'
import { Input } from '@/components/ui-kit/Input'

interface ProductRow {
  id: string
  tempId?: number
  name: string
  unit: string
  categoryId: string
  categoryName: string
  description: string
  sku: string
  cost: number
  price: number
  netMargin: number
  isNew?: boolean
}

interface Category {
  id: string
  name: string
}

interface Company {
  id: string
  name: string
  logo: string | null
}

export default function InventarioEdicionPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [companies, setCompanies] = useState<Company[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [rows, setRows] = useState<ProductRow[]>([
    { id: '', tempId: 1, name: '', unit: 'UNI', categoryId: '', categoryName: '', description: '', sku: '', cost: 0, price: 0, netMargin: 0, isNew: true },
  ])
  const [isSaving, setIsSaving] = useState(false)

  const normalizeCategoryName = (value: string) =>
    value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

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
    if (!token || selectedCompany === 'all') return

    try {
      const response = await fetch(`/api/product-categories?companyId=${selectedCompany}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [selectedCompany])

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
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          companyId: selectedCompany,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setCategories((prev) => [...prev, data.data])
        setShowCategoryModal(false)
        setNewCategoryName('')
      } else {
        alert(data.error || 'Error al crear categoría')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Error al crear categoría')
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const addRow = () => {
    const newRow: ProductRow = {
      id: '',
      tempId: Date.now(),
      name: '',
      unit: 'UNI',
      categoryId: '',
      categoryName: '',
      description: '',
      sku: '',
      cost: 0,
      price: 0,
      netMargin: 0,
      isNew: true,
    }
    setRows([...rows, newRow])
  }

  const updateCategoryField = (index: number, value: string) => {
    const updated = [...rows]
    const matchedCategory = categories.find(
      (cat) =>
        cat.id === value ||
        normalizeCategoryName(cat.name) === normalizeCategoryName(value)
    )

    updated[index] = {
      ...updated[index],
      categoryName: value,
      categoryId: matchedCategory?.id || '',
    }

    setRows(updated)
  }

  const updateRow = (index: number, field: keyof ProductRow, value: string | number) => {
    const updated = [...rows]
    updated[index] = { ...updated[index], [field]: value }
    
    // Auto-calculate margin when cost or price changes
    if (field === 'cost' || field === 'price') {
      const cost = field === 'cost' ? Number(value) : updated[index].cost
      const price = field === 'price' ? Number(value) : updated[index].price
      if (cost > 0) {
        const margin = ((price - cost) / cost) * 100
        updated[index].netMargin = Math.round(margin * 100) / 100
      }
    }
    
    setRows(updated)
  }

  const deleteRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index))
    }
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (selectedCompany === 'all') {
      alert('Selecciona una empresa antes de importar el archivo')
      event.target.value = ''
      return
    }

    const normalizeHeader = (value: string) =>
      value
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')

    const toNumber = (value: unknown) => {
      if (value === null || value === undefined || value === '') return 0
      const raw = String(value).trim()
      const normalized = raw.includes(',') && raw.includes('.') ? raw.replace(/,/g, '') : raw.replace(',', '.')
      const parsed = Number(normalized)
      return Number.isFinite(parsed) ? parsed : 0
    }

    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const parsedRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })

      if (!parsedRows.length) {
        alert('El archivo no contiene filas para importar')
        return
      }

      const categoriesByName = new Map(
        categories.map((category) => [normalizeHeader(category.name), category.id])
      )

      const importedRows = parsedRows
        .map((row, index) => {
          const normalizedRow = Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
            acc[normalizeHeader(key)] = value
            return acc
          }, {})

          const pickValue = (...aliases: string[]) => {
            for (const alias of aliases) {
              const value = normalizedRow[normalizeHeader(alias)]
              if (value !== undefined && value !== null && String(value).trim() !== '') {
                return value
              }
            }
            return ''
          }

          const categoryInput = String(
            pickValue('categoria', 'category', 'categoryname', 'nombrecategoria', 'categoryid')
          ).trim()
          const normalizedCategory = normalizeHeader(categoryInput)
          const matchedCategoryId =
            categoriesByName.get(normalizedCategory) ||
            categories.find((category) => category.id === categoryInput)?.id ||
            ''

          const name = String(pickValue('nombre', 'name', 'producto', 'product', 'articulo')).trim()
          // SKU es opcional - usar Articulo, codigo, o generar uno automático
          let sku = String(pickValue('sku', 'codigo', 'code', 'codigointerno', 'articulo')).trim()
          if (!sku && name) {
            // Generar SKU automático basado en nombre + timestamp
            sku = `AUTO-${name.substring(0, 10).toUpperCase().replace(/\s+/g, '-')}-${index}`
          }

          // Mapear columnas del formato del usuario
          const familia = String(pickValue('familia', 'family', 'categoria', 'category')).trim()
          const subfamilia = String(pickValue('subfamilia', 'subfamily')).trim()
          const marca = String(pickValue('marca', 'brand')).trim()
          const descripcionParts = [subfamilia, marca].filter(Boolean).join(' - ')

          return {
            id: '',
            tempId: Date.now() + index,
            name,
            unit: String(pickValue('unidad', 'unit', 'unikg') || 'UNI').trim().toUpperCase() || 'UNI',
            categoryId: matchedCategoryId || (familia ? categoriesByName.get(normalizeHeader(familia)) : '') || '',
            categoryName: categoryInput || familia || '',
            description: String(pickValue('descripcion', 'description', 'detalle') || descripcionParts).trim(),
            sku,
            cost: toNumber(pickValue('costo', 'cost', 'preciocosto', 'costopromedio', 'costoenbodega')),
            price: toNumber(pickValue('precio', 'price', 'pvp')),
            netMargin: toNumber(pickValue('margenneto', 'netmargin', 'margen', 'margin')),
            stock: toNumber(pickValue('stock', 'cantidad', 'cantidadenbodega', 'existencia')),
            isNew: true,
          }
        })
        .filter((row) => {
          // Validar que tenga al menos nombre O sku
          const hasName = row.name && row.name.trim().length > 0
          const hasSku = row.sku && row.sku.trim().length > 0
          return hasName || hasSku
        })

      if (!importedRows.length) {
        alert('No se encontraron filas válidas. Verifica que el archivo incluya al menos una columna de Nombre, Producto, Articulo, SKU o Codigo.')
        return
      }

      setRows(importedRows)
      alert(`${importedRows.length} productos cargados. Revisa y presiona FINALIZAR para guardar.`)
    } catch (error) {
      console.error('Error importing inventory file:', error)
      alert('No se pudo procesar el archivo. Usa un archivo XLSX/XLS/CSV válido.')
    } finally {
      event.target.value = ''
    }
  }

  const handleSave = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || selectedCompany === 'all') {
      alert('Seleccione una empresa')
      return
    }

    const validRows = rows.filter(row => row.name.trim() !== '')
    if (validRows.length === 0) {
      alert('Agregue al menos un producto con nombre')
      return
    }
    // Generar SKU automático para productos sin SKU
    const rowsWithSku = validRows.map((row, idx) => ({
      ...row,
      sku: row.sku.trim() || `AUTO-${Date.now()}-${idx}`,
    }))

    const categoryMap = new Map(
      categories.map((category) => [normalizeCategoryName(category.name), category.id])
    )

    const newCategories = Array.from(
      new Set(
        rowsWithSku
          .map((row) => row.categoryName?.trim() || '')
          .filter((name) => name && !categoryMap.has(normalizeCategoryName(name)))
      )
    )

    const createdCategories: Category[] = []
    for (const categoryName of newCategories) {
      const createCategoryRes = await fetch('/api/product-categories', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryName,
          companyId: selectedCompany,
        }),
      })

      const createCategoryData = await createCategoryRes.json()
      if (!createCategoryData.success) {
        alert(createCategoryData.error || `No se pudo crear la categoría: ${categoryName}`)
        setIsSaving(false)
        return
      }

      const createdCategory = createCategoryData.data as Category
      createdCategories.push(createdCategory)
      categoryMap.set(normalizeCategoryName(createdCategory.name), createdCategory.id)
    }

    if (createdCategories.length > 0) {
      setCategories((prev) => [...prev, ...createdCategories])
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: selectedCompany,
          products: rowsWithSku.map(row => ({
            name: row.name,
            unit: row.unit,
            categoryId:
              row.categoryId ||
              categoryMap.get(normalizeCategoryName(row.categoryName || '')) ||
              null,
            description: row.description || null,
            sku: row.sku,
            cost: row.cost,
            price: row.price,
            netMargin: row.netMargin,
          })),
        }),
      })

      const data = await response.json()
      if (data.success) {
        const skipped = data.data?.skipped || 0
        if (skipped > 0) {
          alert(`${data.data.count} productos creados. ${skipped} omitidos por SKU duplicado.`)
        } else {
          alert(`${data.data.count} productos creados exitosamente`)
        }
        router.push('/inventario')
      } else {
        alert('Error al guardar productos')
      }
    } catch (error) {
      console.error('Error saving products:', error)
      alert('Error al guardar productos')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (rowIndex === rows.length - 1) {
        addRow()
      }
    } else if (e.key === 'Delete' && e.ctrlKey) {
      e.preventDefault()
      deleteRow(rowIndex)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <button onClick={() => router.push('/inventario')} className="hover:text-primary">
              INVENTARIO
            </button>
            <span>&gt;</span>
            <span className="text-primary font-medium">EDICIÓN/AGREGADO</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Completa los detalles para generar una propuesta comercial.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            CARGAR ARCHIVO
          </Button>
          <Button variant="outline" onClick={() => router.push('/inventario')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            CANCELAR
          </Button>
          <Button variant="outline" disabled={isSaving}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            GUARDAR BORRADOR
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isSaving ? 'GUARDANDO...' : 'FINALIZAR'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <Select
            options={[
              { value: 'all', label: 'TODAS LAS EMPRESAS' },
              ...companies.map((company) => ({ value: company.id, label: company.name })),
            ]}
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">PRODUCTO</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-28">UNIDAD</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-40">CATEGORÍA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">DESC.</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-40">SKU</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase w-28">COSTO</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase w-28">PRECIO</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase w-32">MARGEN %</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.tempId || row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(index, 'name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder={index === rows.length - 1 ? 'Producto...' : 'Nombre del producto'}
                      fullWidth
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="text"
                      value={row.unit}
                      onChange={(e) => updateRow(index, 'unit', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder="UNI/KG/LT"
                      fullWidth
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        list={`category-options-${index}`}
                        value={row.categoryName}
                        onChange={(e) => updateCategoryField(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        placeholder="Categoría..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      />
                      <datalist id={`category-options-${index}`}>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name} />
                        ))}
                      </datalist>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="p-2 border border-gray-200 rounded-lg text-primary hover:bg-primary/5"
                        title="Agregar categoría"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateRow(index, 'description', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder={index === rows.length - 1 ? 'Descripción...' : 'Descripción del producto'}
                      fullWidth
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="text"
                      value={row.sku}
                      onChange={(e) => updateRow(index, 'sku', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder={index === rows.length - 1 ? 'SKU...' : 'SKU-000'}
                      fullWidth
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="number"
                      value={row.cost}
                      onChange={(e) => updateRow(index, 'cost', parseFloat(e.target.value) || 0)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder={index === rows.length - 1 ? 'Costo...' : '18 $'}
                      fullWidth
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="number"
                      value={row.price}
                      onChange={(e) => updateRow(index, 'price', parseFloat(e.target.value) || 0)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder={index === rows.length - 1 ? 'Precio...' : '34 $'}
                      fullWidth
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="number"
                      step="0.01"
                      value={row.netMargin}
                      onChange={(e) => updateRow(index, 'netMargin', parseFloat(e.target.value) || 0)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder={index === rows.length - 1 ? 'Margen %...' : '0.00'}
                      fullWidth
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => deleteRow(index)}
                      className="text-error hover:text-error-dark"
                      disabled={rows.length === 1}
                    >
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

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">TAB</kbd> Siguiente celda</span>
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">CTRL + DELETE</kbd> Borrar fila</span>
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">ENTER</kbd> Agregar nueva fila</span>
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">↑</kbd> <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">↓</kbd> Navegar entre filas</span>
            </div>
            <button
              onClick={addRow}
              className="text-primary hover:text-primary-dark font-medium flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar fila
            </button>
          </div>
        </div>
      </div>
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Nueva Categoría</h2>
            </div>
            <div className="p-6">
              <Input
                label="Nombre de la Categoría"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ej: Electrónica, Alimentos, etc."
                fullWidth
              />
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
                Cancelar
              </Button>
              <Button onClick={handleCreateCategory} className="flex-1 bg-primary hover:bg-primary-dark">
                Crear Categoría
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
