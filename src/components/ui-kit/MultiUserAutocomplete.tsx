'use client'

import { useState, useEffect, useRef } from 'react'

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
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredUsers = users.filter((u) => {
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
      {isOpen && filteredUsers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredUsers.map((u) => (
            <button
              key={u.userId}
              type="button"
              onClick={() => addUser(u.user.name)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex flex-col border-b border-gray-100 last:border-b-0"
            >
              <span className="text-sm font-medium text-gray-900">{u.user.name}</span>
              <span className="text-xs text-gray-500">{u.user.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
