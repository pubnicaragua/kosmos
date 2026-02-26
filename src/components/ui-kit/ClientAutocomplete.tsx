'use client'

import { useState, useEffect, useRef } from 'react'

interface ClientOption {
  id: string
  name: string
  email: string | null
  contactName: string | null
}

interface ClientAutocompleteProps {
  companyId: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function ClientAutocomplete({
  companyId,
  value,
  onChange,
  placeholder = 'Buscar cliente...',
  className = '',
}: ClientAutocompleteProps) {
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSearch(value)
  }, [value])

  useEffect(() => {
    const fetchClients = async () => {
      if (!companyId || companyId === 'all') return
      const token = localStorage.getItem('accessToken')
      if (!token) return
      try {
        const res = await fetch(`/api/clients?companyId=${companyId}&limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success) {
          const list = Array.isArray(data.data) ? data.data : (data.data?.data ?? [])
          setClients(list)
        }
      } catch (e) {
        console.error('Error fetching clients:', e)
      }
    }
    fetchClients()
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

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.contactName || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (name: string) => {
    setSearch(name)
    onChange(name)
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
        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c.name)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex flex-col border-b border-gray-100 last:border-b-0"
            >
              <span className="text-sm font-medium text-gray-900">{c.name}</span>
              {(c.contactName || c.email) && (
                <span className="text-xs text-gray-500">{c.contactName || c.email}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
