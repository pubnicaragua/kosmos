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

interface UserAutocompleteProps {
  companyId: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  fullWidth?: boolean
}

export function UserAutocomplete({
  companyId,
  value,
  onChange,
  placeholder = 'Buscar usuario...',
  label,
  required = false,
  fullWidth = false,
}: UserAutocompleteProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      if (!companyId || companyId === 'all') return

      const token = localStorage.getItem('accessToken')
      if (!token) return

      try {
        const response = await fetch(`/api/companies/${companyId}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (data.success) {
          setUsers(data.data)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    fetchUsers()
  }, [companyId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredUsers = users.filter((u) =>
    u.user.name.toLowerCase().includes(search.toLowerCase()) ||
    u.user.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (userName: string) => {
    setSearch(userName)
    onChange(userName)
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className={`relative ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
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
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
      />
      {isOpen && filteredUsers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredUsers.map((user) => (
            <button
              key={user.userId}
              type="button"
              onClick={() => handleSelect(user.user.name)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex flex-col border-b border-gray-100 last:border-b-0"
            >
              <span className="text-sm font-medium text-gray-900">{user.user.name}</span>
              <span className="text-xs text-gray-500">{user.user.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
