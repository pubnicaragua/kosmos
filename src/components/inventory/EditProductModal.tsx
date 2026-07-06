'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui-kit/Button'

export interface EditProductTarget {
  id: string
  name: string
  sku: string
  stock: number
  cost: number
  publicPrice: number
  minPrice: number
  distributorPrice: number
}

interface Category {
  id: string
  name: string
}

interface ProductDetail {
  id: string
  name: string
  sku: string
  description: string | null
  stock: number
  cost: number
  publicPrice: number
  minPrice: number
  distributorPrice: number
  unit: string
  categoryId: string | null
}

interface EditForm {
  name: string
  unit: string
  categoryId: string
  description: string
  sku: string
  stock: string
  cost: string
  publicPrice: string
  minPrice: string
  distributorPrice: string
}

interface EditProductModalProps {
  product: EditProductTarget | null
  onClose: () => void
  onSaved: () => void
}

export function EditProductModal({ product, onClose, onSaved }: EditProductModalProps) {
  const [form, setForm] = useState<EditForm | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!product) {
      setForm(null)
      setCategories([])
      setError(null)
      return
    }
    const token = localStorage.getItem('accessToken')
    if (!token) return

    setLoading(true)
    setError(null)

    Promise.all([
      fetch(`/api/products/${product.id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/product-categories', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([productData, categoriesData]) => {
        if (productData?.success) {
          const p: ProductDetail = productData.data
          setForm({
            name: p.name || '',
            unit: p.unit || 'UNI',
            categoryId: p.categoryId || '',
            description: p.description || '',
            sku: p.sku || '',
            stock: String(p.stock ?? 0),
            cost: String(p.cost ?? 0),
            publicPrice: String(p.publicPrice ?? 0),
            minPrice: String(p.minPrice ?? 0),
            distributorPrice: String(p.distributorPrice ?? 0),
          })
        } else {
          setError(productData?.error || 'No se pudo cargar el producto')
        }
        if (categoriesData?.success && Array.isArray(categoriesData.data)) {
          setCategories(categoriesData.data)
        }
      })
      .catch(() => setError('Error al cargar datos del producto'))
      .finally(() => setLoading(false))
  }, [product])

  if (!product) return null

  const updateField = (field: keyof EditForm, value: string) => {
    setForm((prev) => {
      if (!prev) return prev
      return { ...prev, [field]: value }
    })
  }

  const handleSave = async () => {
    if (!form) return
    const parsedCost = parseFloat(form.cost) || 0
    if ((parseFloat(form.publicPrice) || 0) < parsedCost || (parseFloat(form.minPrice) || 0) < parsedCost || (parseFloat(form.distributorPrice) || 0) < parsedCost) {
      setError('Ninguno de los precios puede ser menor al costo')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          unit: form.unit,
          categoryId: form.categoryId || null,
          description: form.description || null,
          sku: form.sku,
          stock: Number(form.stock) || 0,
          cost: Number(form.cost) || 0,
          publicPrice: Number(form.publicPrice) || 0,
          minPrice: Number(form.minPrice) || 0,
          distributorPrice: Number(form.distributorPrice) || 0,
        }),
      })
      if (res.ok) {
        onSaved()
        onClose()
      } else {
        setError('Error al guardar cambios')
      }
    } catch {
      setError('Error al guardar cambios')
    } finally {
      setSaving(false)
    }
  }

  const inputBase =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none'

  const labelBase =
    'text-[10px] font-black uppercase tracking-widest text-slate-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-600">Editar producto</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{product.name}</h2>
            <p className="mt-1 text-xs font-mono uppercase tracking-widest text-slate-400">SKU {product.sku}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-500" />
          </div>
        ) : form ? (
          <>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
              <div className="space-y-1">
                <label className={labelBase}>Producto</label>
                <input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className={inputBase}
                  placeholder="Nombre del producto"
                />
              </div>

              <div className="space-y-1">
                <label className={labelBase}>Unidad</label>
                <input
                  value={form.unit}
                  onChange={(e) => updateField('unit', e.target.value)}
                  placeholder="UNI"
                  className={inputBase}
                />
              </div>

              <div className="space-y-1">
                <label className={labelBase}>Categoría</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => updateField('categoryId', e.target.value)}
                  className={inputBase}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className={labelBase}>Descripción</label>
                <input
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Descripción del producto"
                  className={inputBase}
                />
              </div>

              <div className="space-y-1">
                <label className={labelBase}>SKU</label>
                <input
                  value={form.sku}
                  onChange={(e) => updateField('sku', e.target.value)}
                  placeholder="SKU"
                  className={`${inputBase} font-mono`}
                />
              </div>

              <div className="space-y-1">
                <label className={labelBase}>Stock</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => updateField('stock', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }}
                  className={`${inputBase} text-center`}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1">
                <label className={labelBase}>Costo</label>
                <input
                  type="number"
                  min="0"
                  value={form.cost}
                  onChange={(e) => updateField('cost', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }}
                  className={`${inputBase} text-right`}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1">
                <label className={labelBase}>Precio Público</label>
                <input
                  type="number"
                  min="0"
                  value={form.publicPrice}
                  onChange={(e) => updateField('publicPrice', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }}
                  className={`${inputBase} text-right ${Number(form.publicPrice) < Number(form.cost) ? 'border-red-400 bg-red-50' : ''}`}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1">
                <label className={labelBase}>Precio Mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={form.minPrice}
                  onChange={(e) => updateField('minPrice', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }}
                  className={`${inputBase} text-right ${Number(form.minPrice) < Number(form.cost) ? 'border-red-400 bg-red-50' : ''}`}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1">
                <label className={labelBase}>Precio Distribuidor</label>
                <input
                  type="number"
                  min="0"
                  value={form.distributorPrice}
                  onChange={(e) => updateField('distributorPrice', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }}
                  className={`${inputBase} text-right ${Number(form.distributorPrice) < Number(form.cost) ? 'border-red-400 bg-red-50' : ''}`}
                  placeholder="0"
                />
              </div>
            </div>

            {error && (
              <div className="mx-6 mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </>
        ) : (
          <div className="p-6 text-sm text-slate-500">{error || 'Cargando...'}</div>
        )}
      </div>
    </div>
  )
}
