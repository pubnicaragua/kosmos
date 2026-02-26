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
    const loadSession = () => {
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
    if (!query.trim()) {
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
      const results: SearchResult[] = []
      const lowerQuery = query.toLowerCase()

      // Search clients
      const clientsRes = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const clientsData = await clientsRes.json()
      if (clientsData.success) {
        const clientsList = Array.isArray(clientsData.data) ? clientsData.data : []
        clientsList
          .filter((c: any) => 
            c.name?.toLowerCase().includes(lowerQuery) ||
            c.email?.toLowerCase().includes(lowerQuery) ||
            c.phone?.includes(query)
          )
          .slice(0, 5)
          .forEach((c: any) => {
            results.push({
              id: c.id,
              type: 'client',
              title: c.name,
              subtitle: c.email || c.phone || '',
              url: `/clientes?highlight=${c.id}`,
            })
          })
      }

      // Search incomes
      const incomesRes = await fetch('/api/incomes', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const incomesData = await incomesRes.json()
      if (incomesData.success) {
        const incomesList = Array.isArray(incomesData.data)
          ? incomesData.data
          : Array.isArray(incomesData.data?.data)
            ? incomesData.data.data
            : []
        incomesList
          .filter((i: any) => 
            i.description?.toLowerCase().includes(lowerQuery) ||
            i.client?.name?.toLowerCase().includes(lowerQuery)
          )
          .slice(0, 3)
          .forEach((i: any) => {
            results.push({
              id: i.id,
              type: 'income',
              title: i.description,
              subtitle: `$${i.amount?.toLocaleString()} - ${i.client?.name || 'Sin cliente'}`,
              url: `/ingresos?highlight=${i.id}`,
            })
          })
      }

      // Search opportunities
      const oppsRes = await fetch('/api/opportunities', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const oppsData = await oppsRes.json()
      if (oppsData.success) {
        const opportunitiesList = Array.isArray(oppsData.data)
          ? oppsData.data
          : Array.isArray(oppsData.data?.data)
            ? oppsData.data.data
            : []
        opportunitiesList
          .filter((o: any) => 
            o.title?.toLowerCase().includes(lowerQuery) ||
            o.client?.name?.toLowerCase().includes(lowerQuery)
          )
          .slice(0, 3)
          .forEach((o: any) => {
            results.push({
              id: o.id,
              type: 'opportunity',
              title: o.title,
              subtitle: `${o.client?.name || 'Sin cliente'} - $${o.value?.toLocaleString()}`,
              url: `/pipeline-ventas?highlight=${o.id}`,
            })
          })
      }

      // Search contracts
      const contractsRes = await fetch('/api/contracts', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const contractsData = await contractsRes.json()
      if (contractsData.success) {
        const contractsList = Array.isArray(contractsData.data)
          ? contractsData.data
          : Array.isArray(contractsData.data?.data)
            ? contractsData.data.data
            : []
        contractsList
          .filter((c: any) => 
            c.title?.toLowerCase().includes(lowerQuery) ||
            c.client?.name?.toLowerCase().includes(lowerQuery)
          )
          .slice(0, 3)
          .forEach((c: any) => {
            results.push({
              id: c.id,
              type: 'contract',
              title: c.title,
              subtitle: c.client?.name || 'Sin cliente',
              url: `/contratos?highlight=${c.id}`,
            })
          })
      }

      setSearchResults(results)
      setShowResults(true)
      setSelectedIndex(0)
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
    <header className="bg-white border-b border-gray-200 h-16">
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
