'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

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
  onSelect?: (client: ClientOption) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function ClientAutocomplete({
  companyId,
  value,
  onChange,
  onSelect,
  placeholder = 'Buscar cliente...',
  className = '',
  disabled = false,
}: ClientAutocompleteProps) {
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // If value looks like an ID (cuid format), find the client name
    if (value && clients.length > 0) {
      const client = clients.find(c => c.id === value)
      if (client) {
        setSearch(client.name)
      } else {
        setSearch(value)
      }
    } else {
      setSearch(value)
    }
  }, [value, clients])

  useEffect(() => {
    const fetchClients = async () => {
      if (!companyId) return
      const token = localStorage.getItem('accessToken')
      if (!token) return
      try {
        const params = new URLSearchParams()
        if (companyId !== 'all') params.append('companyId', companyId)
        params.append('limit', '200')
        const res = await fetch(`/api/clients?${params.toString()}`, {
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

  const safeClients = Array.isArray(clients) ? clients : []
  // Sort clients alphabetically by name
  const sortedClients = [...safeClients].sort((a, b) => a.name.localeCompare(b.name))
  const filtered = sortedClients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.contactName || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (client: ClientOption) => {
    setSearch(client.name)
    onChange(client.id)
    if (onSelect) onSelect(client)
    setIsOpen(false)
  }

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const updatePosition = () => {
        if (!wrapperRef.current) return
        const rect = wrapperRef.current.getBoundingClientRect()
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        })
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
        disabled={disabled}
        className={`w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
      {isOpen && filtered.length > 0 && typeof document !== 'undefined' && createPortal(
        <div style={dropdownStyle} className="z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex flex-col border-b border-gray-100 last:border-b-0"
            >
              <span className="text-sm font-medium text-gray-900">{c.name}</span>
              {(c.contactName || c.email) && (
                <span className="text-xs text-gray-500">{c.contactName || c.email}</span>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

