'use client'

import { useState, useEffect, useRef } from 'react'

interface ProductOption {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  category?: { name: string }
}

interface ProductAutocompleteProps {
  companyId: string
  value: string
  onChange: (value: string) => void
  onSelect?: (product: ProductOption) => void
  placeholder?: string
  className?: string
}

export function ProductAutocomplete({
  companyId,
  value,
  onChange,
  onSelect,
  placeholder = 'Buscar producto o SKU...',
  className = '',
}: ProductAutocompleteProps) {
  const [products, setProducts] = useState<ProductOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSearch(value)
  }, [value])

  useEffect(() => {
    const fetchProducts = async () => {
      if (!companyId || companyId === 'all') return
      const token = localStorage.getItem('accessToken')
      if (!token) return
      try {
        const res = await fetch(`/api/products?companyId=${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success) {
          const list = Array.isArray(data.data) ? data.data : (data.data?.data ?? [])
          setProducts(list)
        }
      } catch (e) {
        console.error('Error fetching products:', e)
      }
    }
    fetchProducts()
  }, [companyId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const safeProducts = Array.isArray(products) ? products : []
  // Sort products alphabetically by name
  const sortedProducts = [...safeProducts].sort((a, b) => a.name.localeCompare(b.name))
  const filtered = sortedProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (product: ProductOption) => {
    setSearch(product.name)
    onChange(product.name)
    if (onSelect) onSelect(product)
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex flex-col border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-slate-800">{p.name}</span>
                <span className="text-xs font-black text-primary">${p.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">SKU: {p.sku}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.stock > 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                  STOCK: {p.stock}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
