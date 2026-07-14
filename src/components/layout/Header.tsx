'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/common/Logo'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { Search, X, TrendingUp, Users, DollarSign, FileText, Loader2 } from 'lucide-react'

interface SearchResult {
  id: string
  type: 'client' | 'income' | 'opportunity' | 'contract'
  title: string
  subtitle?: string
  url: string
}

export function Header() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const loadSession = async () => {
      const storedUser = localStorage.getItem('user')
      const storedActiveCompany = localStorage.getItem('activeCompany')

      if (!storedUser) {
        setUser(null)
        return
      }

      const parsedUser = JSON.parse(storedUser)
      const parsedActiveCompany = storedActiveCompany ? JSON.parse(storedActiveCompany) : null

      setUser({
        ...parsedUser,
        role: parsedActiveCompany?.role || parsedUser.role,
      })

      // Fetch fresh avatar from API to avoid stale localStorage
      try {
        const token = localStorage.getItem('accessToken')
        if (token) {
          const res = await fetch('/api/profiles/current', {
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = await res.json()
          const freshAvatar = data.data?.user?.avatar
          if (data.success && freshAvatar) {
            setUser((prev: any) => prev ? { ...prev, avatar: freshAvatar } : prev)
            // Update localStorage too
            const storedStr = localStorage.getItem('user')
            if (storedStr) {
              const stored = JSON.parse(storedStr)
              localStorage.setItem('user', JSON.stringify({ ...stored, avatar: freshAvatar }))
            }
          }
        }
      } catch {
        // silently fail, avatar will use initials fallback
      }
    }

    loadSession()

    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === 'user' || event.key === 'activeCompany') {
        loadSession()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setIsSearching(false)
      return
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      
      if (data.success && data.data.results) {
        const allResults: SearchResult[] = []
        const results = data.data.results

        // Add all results from different categories
        if (results.clientes) {
          results.clientes.forEach((item: any) => {
            allResults.push({
              id: item.id,
              type: 'client',
              title: item.title,
              subtitle: item.subtitle,
              url: item.link
            })
          })
        }

        if (results.oportunidades) {
          results.oportunidades.forEach((item: any) => {
            allResults.push({
              id: item.id,
              type: 'opportunity',
              title: item.title,
              subtitle: item.subtitle,
              url: item.link
            })
          })
        }

        if (results.ingresos) {
          results.ingresos.forEach((item: any) => {
            allResults.push({
              id: item.id,
              type: 'income',
              title: item.title,
              subtitle: item.subtitle,
              url: item.link
            })
          })
        }

        if (results.gastos) {
          results.gastos.forEach((item: any) => {
            allResults.push({
              id: item.id,
              type: 'client', // Use client icon for now
              title: item.title,
              subtitle: item.subtitle,
              url: item.link
            })
          })
        }

        if (results.cotizaciones) {
          results.cotizaciones.forEach((item: any) => {
            allResults.push({
              id: item.id,
              type: 'contract',
              title: item.title,
              subtitle: item.subtitle,
              url: item.link
            })
          })
        }

        setSearchResults(allResults.slice(0, 20))
        setShowResults(true)
        setSelectedIndex(0)
      } else {
        setSearchResults([])
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    
    if (!value.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(value)
    }, 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % searchResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (searchResults[selectedIndex]) {
        router.push(searchResults[selectedIndex].url)
        setShowResults(false)
        setSearchQuery('')
      }
    } else if (e.key === 'Escape') {
      setShowResults(false)
    }
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'client': return Users
      case 'income': return DollarSign
      case 'opportunity': return TrendingUp
      case 'contract': return FileText
      default: return Search
    }
  }

  const getResultLabel = (type: string) => {
    switch (type) {
      case 'client': return 'Cliente'
      case 'income': return 'Ingreso'
      case 'opportunity': return 'Oportunidad'
      case 'contract': return 'Contrato'
      default: return ''
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex-shrink-0">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div ref={searchRef} className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar clientes, ingresos, oportunidades..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => searchQuery && setShowResults(true)}
              className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                  setShowResults(false)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {isSearching && (
              <Loader2 className="w-4 h-4 text-primary absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
            )}

            {/* Search Results Dropdown */}
            {showResults && searchQuery && (
              <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                {searchResults.length === 0 && !isSearching && (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No se encontraron resultados para &quot;{searchQuery}&quot;
                  </div>
                )}
                {searchResults.map((result, index) => {
                  const Icon = getResultIcon(result.type)
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => {
                        router.push(result.url)
                        setShowResults(false)
                        setSearchQuery('')
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        index === selectedIndex ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-gray-500 uppercase">
                              {getResultLabel(result.type)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
                {searchResults.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Usa ↑↓ para navegar, Enter para seleccionar, Esc para cerrar
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/sistema/monitor')}
            className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-full hover:bg-success/20 transition-colors"
          >
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-sm font-medium text-success">Sistema Operativo</span>
          </button>
          
          <NotificationCenter />

          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{user?.name || 'Usuario'}</div>
              <div className="text-xs text-gray-500">
                {user?.role === 'SUPER_ADMIN' ? 'Super Administrador' : 
                 user?.role === 'ADMIN' ? 'Administrador' :
                 user?.role === 'MANAGER' ? 'Gerente' :
                 user?.role === 'USER' ? 'Usuario' :
                 user?.role || 'Sin cargo'}
              </div>
            </div>
            <div className="relative group">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center cursor-pointer overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : null}
                {!user?.avatar && (
                  <span className="text-sm font-semibold text-primary">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => {
                    localStorage.removeItem('accessToken')
                    localStorage.removeItem('refreshToken')
                    localStorage.removeItem('user')
                    localStorage.removeItem('activeCompany')
                    localStorage.removeItem('rememberMe')
                    router.push('/login')
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
