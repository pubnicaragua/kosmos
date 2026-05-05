'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Check, Search, User as UserIcon } from 'lucide-react'

interface User {
  userId: string
  role: string
  user: {
    id: string
    name: string
    email: string
    avatar?: string | null
  }
}

interface MultiUserSelectorProps {
  companyId: string
  selectedUserIds: string[]
  onChange: (userIds: string[]) => void
  label?: string
  placeholder?: string
  maxSelections?: number
}

export function MultiUserSelector({
  companyId,
  selectedUserIds = [],
  onChange,
  label,
  placeholder = 'Buscar y asignar usuarios...',
  maxSelections = 5,
}: MultiUserSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      if (!companyId || companyId === 'all') return

      const token = localStorage.getItem('accessToken')
      if (!token) return

      try {
        setIsLoading(true)
        const response = await fetch(`/api/companies/${companyId}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (data.success) {
          setUsers(data.data)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setIsLoading(false)
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

  const toggleUser = (userId: string) => {
    let next: string[]
    if (selectedUserIds.includes(userId)) {
      next = selectedUserIds.filter(id => id !== userId)
    } else {
      if (selectedUserIds.length >= maxSelections) return
      next = [...selectedUserIds, userId]
    }
    onChange(next)
  }

  const removeUser = (userId: string) => {
    onChange(selectedUserIds.filter(id => id !== userId))
  }

  const filteredUsers = users.filter((u) =>
    u.user.name.toLowerCase().includes(search.toLowerCase()) ||
    u.user.email.toLowerCase().includes(search.toLowerCase())
  )

  const selectedUsers = users.filter(u => selectedUserIds.includes(u.userId))

  return (
    <div ref={wrapperRef} className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div 
          className="min-h-[42px] p-1.5 flex flex-wrap gap-2 bg-white border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all cursor-text shadow-sm"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {selectedUsers.map((u) => (
            <div 
              key={u.userId} 
              className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-lg text-xs font-semibold animate-in fade-in zoom-in duration-200"
            >
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">
                {u.user.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[100px]">{u.user.name}</span>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); removeUser(u.userId); }}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-sm px-2 min-w-[120px]"
            placeholder={selectedUserIds.length === 0 ? placeholder : ''}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setIsOpen(true)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setIsOpen(false)
              }
            }}
            onFocus={() => setIsOpen(true)}
          />
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {isLoading ? 'Cargando...' : 'No se encontraron usuarios'}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.userId)
                  return (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => toggleUser(u.userId)}
                      className={`w-full p-3 text-left rounded-lg transition-colors flex items-center justify-between group ${
                        isSelected ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white ${
                          isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                        }`}>
                          {u.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{u.user.name}</div>
                          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{u.role}</div>
                        </div>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-200 group-hover:border-primary/30" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
            <div className="p-2 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-400 px-2 uppercase tracking-widest">
                {selectedUserIds.length} Asignados
              </span>
              <div className="flex items-center gap-2">
                {selectedUserIds.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => onChange([])}
                    className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors uppercase tracking-widest"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-bold text-gray-600 hover:bg-gray-200/60 px-2 py-1 rounded transition-colors uppercase tracking-widest"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
