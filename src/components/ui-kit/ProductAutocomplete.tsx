'use client'

import { useState, useEffect, useRef } from 'react'

interface ProductOption {
  id: string
  name: string
  sku: string
  price?: number
  publicPrice: number
  minPrice: number
  distributorPrice: number
  cost: number
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
  inputClassName?: string
  dropdownClassName?: string
}

export function ProductAutocomplete({
  companyId,
  value,
  onChange,
  onSelect,
  placeholder = 'Buscar producto o SKU...',
  className = '',
  inputClassName = '',
  dropdownClassName = '',
}: ProductAutocompleteProps) {
  const [products, setProducts] = useState<ProductOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSearch(value)
  }, [value])

  useEffect(() => {
    const query = search.trim()
    if (!isOpen || !companyId || companyId === 'all' || !query) {
      setProducts([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setProducts([])
        setIsLoading(false)
        return
      }

      try {
        const params = new URLSearchParams({ companyId, search: query, limit: '12' })
        const res = await fetch(`/api/products?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const data = await res.json()
        if (data.success) {
          const list = Array.isArray(data.data) ? data.data : (data.data?.data ?? [])
          setProducts(Array.isArray(list) ? list : [])
        } else {
          setProducts([])
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          console.error('Error buscando productos:', e)
          setProducts([])
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, 180)

    setIsLoading(true)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [companyId, isOpen, search])

  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Si el clic es en el input o en el dropdown (que ahora está en el portal), no cerramos
      if (wrapperRef.current && wrapperRef.current.contains(e.target as Node)) {
        return
      }
      const dropdownElement = document.getElementById('product-autocomplete-dropdown')
      if (dropdownElement && dropdownElement.contains(e.target as Node)) {
        return
      }
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const updatePosition = () => {
        if (wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect()
          setDropdownStyle({
            top: rect.bottom,
            left: rect.left,
            width: rect.width
          })
        }
      }
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen])

  const safeProducts = Array.isArray(products) ? products : []
  const filtered = safeProducts

  const handleSelect = (product: ProductOption) => {
    setSearch(product.name)
    onChange(product.name)
    if (onSelect) onSelect(product)
    setIsOpen(false)
  }

  const dropdownContent = isOpen && (isLoading || filtered.length > 0 || search.trim()) && dropdownStyle ? (
    <div 
      id="product-autocomplete-dropdown"
      className={`fixed z-[9999] mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto ${dropdownClassName}`}
      style={{ top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width }}
    >
      {isLoading ? (
        <div className="px-4 py-3 text-sm text-slate-500">Buscando productos...</div>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-3 text-sm text-slate-500">No se encontraron productos.</div>
      ) : filtered.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => handleSelect(p)}
          className="w-full px-4 py-3 text-left hover:bg-slate-50 flex flex-col border-b border-gray-100 last:border-b-0 transition-colors"
        >
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-slate-800 leading-tight pr-2">{p.name}</span>
            <span className="text-xs font-black text-primary whitespace-nowrap">${(p.publicPrice ?? p.price ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-tight">SKU: {p.sku}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              Stock {p.stock}
            </span>
          </div>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div ref={wrapperRef} className={`relative min-w-0 ${className}`}>
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
        className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${inputClassName}`}
      />
      {typeof window !== 'undefined' && dropdownContent ? require('react-dom').createPortal(dropdownContent, document.body) : null}
    </div>
  )
}
