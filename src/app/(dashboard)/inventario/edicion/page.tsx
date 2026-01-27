'use client'

import { useState, useEffect, useCallback } from 'react'
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
  description: string
  sku: string
  cost: number
  price: number
  isNew?: boolean
}

interface Category {
  id: string
  name: string
}

export default function InventarioEdicionPage() {
  const router = useRouter()
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [categories, setCategories] = useState<Category[]>([])
  const [rows, setRows] = useState<ProductRow[]>([
    { id: '', tempId: 1, name: '', unit: 'UNI', categoryId: '', description: '', sku: '', cost: 0, price: 0, isNew: true },
  ])
  const [isSaving, setIsSaving] = useState(false)

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
      description: '',
      sku: '',
      cost: 0,
      price: 0,
      isNew: true,
    }
    setRows([...rows, newRow])
  }

  const updateRow = (index: number, field: keyof ProductRow, value: string | number) => {
    const updated = [...rows]
    updated[index] = { ...updated[index], [field]: value }
    setRows(updated)
  }

  const deleteRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index))
    }
  }

  const handleSave = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || selectedCompany === 'all') {
      alert('Seleccione una empresa')
      return
    }

    const validRows = rows.filter(row => row.name.trim() !== '' && row.sku.trim() !== '')
    if (validRows.length === 0) {
      alert('Agregue al menos un producto válido')
      return
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
          products: validRows.map(row => ({
            name: row.name,
            unit: row.unit,
            categoryId: row.categoryId || null,
            description: row.description || null,
            sku: row.sku,
            cost: row.cost,
            price: row.price,
          })),
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert(`${data.data.count} productos creados exitosamente`)
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
    if (e.key === 'Tab') {
      e.preventDefault()
      const inputs = document.querySelectorAll('input, select')
      const currentIndex = Array.from(inputs).findIndex(el => el === e.target)
      const nextInput = inputs[currentIndex + 1] as HTMLElement
      if (nextInput) nextInput.focus()
    } else if (e.key === 'Enter') {
      if (rowIndex === rows.length - 1) {
        addRow()
      }
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
              { value: 'company1', label: 'Tech Solutions' },
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
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-28">UNI/KG</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-40">CATEGORÍA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">DESC.</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-40">SKU</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase w-28">COSTO</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase w-28">PRECIO</th>
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
                      placeholder="120"
                      fullWidth
                    />
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={row.categoryId}
                      onChange={(e) => updateRow(index, 'categoryId', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    >
                      <option value="">Categoría...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
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
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">CNTRL + ALT + SUPR</kbd> Borrar fila</span>
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">ENTER</kbd> Confirmar</span>
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
    </div>
  )
}
