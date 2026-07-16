'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface User {
  userId: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface MultiUserAutocompleteProps {
  companyId: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  fullWidth?: boolean
}

export function MultiUserAutocomplete({
  companyId,
  value,
  onChange,
  placeholder = 'Agregar responsable...',
  fullWidth = false,
}: MultiUserAutocompleteProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selected: string[] = value
    ? value.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  useEffect(() => {
    const fetchUsers = async () => {
      if (!companyId || companyId === 'all') return
      const token = localStorage.getItem('accessToken')
      if (!token) return
      try {
        const res = await fetch(`/api/companies/${companyId}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success) setUsers(data.data)
      } catch (err) {
        console.error('Error fetching users:', err)
      }
    }
    fetchUsers()
  }, [companyId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedInsideWrapper = wrapperRef.current?.contains(target)
      const clickedInsideDropdown = dropdownRef.current?.contains(target)
      
      if (!clickedInsideWrapper && !clickedInsideDropdown) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sort users alphabetically by name
  const sortedUsers = [...users].sort((a, b) => a.user.name.localeCompare(b.user.name))
  const filteredUsers = sortedUsers.filter((u) => {
    const q = search.toLowerCase()
    const notSelected = !selected.includes(u.user.name)
    const matchesSearch = !q || u.user.name.toLowerCase().includes(q) || u.user.email.toLowerCase().includes(q)
    return notSelected && matchesSearch
  })

  const addUser = (name: string) => {
    const next = [...selected, name]
    onChange(next.join(','))
    setSearch('')
    setIsOpen(false)
  }

  const removeUser = (name: string) => {
    const next = selected.filter((s) => s !== name)
    onChange(next.join(','))
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
          minWidth: Math.max(rect.width, 320),
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
    <div ref={wrapperRef} className={`relative ${fullWidth ? 'w-full' : ''}`}>
      <div className="flex flex-wrap gap-1 min-h-[36px] px-2 py-1 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
        {selected.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
          >
            {name}
            <button
              type="button"
              onClick={() => removeUser(name)}
              className="hover:text-indigo-900 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          placeholder={selected.length === 0 ? placeholder : '+ Agregar...'}
          className="flex-1 min-w-[80px] text-sm outline-none bg-transparent py-0.5"
        />
      </div>
      {isOpen && filteredUsers.length > 0 && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          style={dropdownStyle} 
          className="z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {filteredUsers.map((u) => (
            <button
              key={u.userId}
              type="button"
              onClick={() => addUser(u.user.name)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex flex-col border-b border-gray-100 last:border-b-0"
            >
              <span className="text-sm font-medium text-gray-900">{u.user.name}</span>
              <span className="text-xs text-gray-500 mt-1">{u.user.email}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

