'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { navigationSections } from '@/config/navigation'
import { 
  LayoutDashboard, DollarSign, TrendingDown, Clipboard, Users, 
  Filter, Package, HelpCircle, FileText, FileSignature, Settings,
  LogOut, Menu, X, Megaphone, ChevronLeft, ChevronRight
} from 'lucide-react'

const iconMap: Record<string, any> = {
  LayoutDashboard,
  DollarSign,
  TrendingDown,
  Clipboard,
  Users,
  Filter,
  Megaphone,
  Package,
  HelpCircle,
  FileText,
  FileSignature,
  Settings,
}

// Map nav item id -> module key used in RolePermission
const NAV_TO_MODULE: Record<string, string> = {
  dashboards: 'dashboard',
  incomes: 'ingresos',
  expenses: 'gastos',
  activities: 'actividades',
  clients: 'clientes',
  'sales-pipeline': 'pipeline-ventas',
  marketing: 'marketing',
  inventory: 'inventario',
  support: 'tickets-soporte',
  rrhh: 'recursos-humanos',
  documents: 'documentos',
  contracts: 'contratos',
  system: 'sistema',
}

interface RolePermission {
  module: string
  canView: boolean
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [allowedModules, setAllowedModules] = useState<Set<string> | null>(null)
  const [customRoleName, setCustomRoleName] = useState<string | null>(null)

  const syncUserFromStorage = useCallback(() => {
    const storedUser = localStorage.getItem('user')
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')

    if (!storedUser) {
      setUser(null)
      return
    }

    const parsedUser = JSON.parse(storedUser)
    setUser({
      ...parsedUser,
      role: activeCompany?.role || parsedUser.role,
    })
  }, [])

  const loadPermissions = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    if (!token || !activeCompany?.id) return

    try {
      const res = await fetch(`/api/companies/${activeCompany.id}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!data.success) return

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const me = data.data.find((m: any) => m.userId === storedUser.id)
      if (!me) return

      setUser((prev: any) => ({
        ...(prev || storedUser),
        role: me.role || prev?.role || storedUser.role,
      }))

      // Custom role always takes precedence for visual module filtering
      if (me.customRole) {
        const allowed = new Set<string>(
          me.customRole.permissions
            .filter((p: RolePermission) => p.canView)
            .map((p: RolePermission) => p.module)
        )
        setAllowedModules(allowed)
        setCustomRoleName(me.customRole.name)
      } else {
        // SUPER_ADMIN/ADMIN/MANAGER without custom role keep full access
        if (['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(me.role)) {
          setAllowedModules(null)
        } else {
          // USER without custom role gets default full access for backwards compatibility
          setAllowedModules(null)
        }
        setCustomRoleName(null)
      }
    } catch (err) {
      console.error('Error loading permissions:', err)
    }
  }, [])

  useEffect(() => {
    syncUserFromStorage()
    loadPermissions()
  }, [loadPermissions, syncUserFromStorage])

  // Reload permissions on route change to pick up newly assigned roles
  useEffect(() => {
    loadPermissions()
  }, [pathname, loadPermissions])

  // Reload when active company changes (storage event from other tabs or same page)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'activeCompany' || e.key === 'user') {
        syncUserFromStorage()
        loadPermissions()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [loadPermissions, syncUserFromStorage])

  const isItemVisible = (itemId: string): boolean => {
    if (allowedModules === null) return true // full access
    const moduleKey = NAV_TO_MODULE[itemId]
    if (!moduleKey) return true // unknown items always visible
    return allowedModules.has(moduleKey)
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('activeCompany')
    localStorage.removeItem('rememberMe')
    router.push('/login')
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        bg-white border-r border-gray-200 min-h-screen flex flex-col
        transform transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-[72px] overflow-hidden' : 'lg:w-64 overflow-x-hidden'}
        w-64
      `}>
        {/* Logo + Toggle */}
        <div className={`p-4 border-b border-gray-100 flex items-center transition-all ${isCollapsed ? 'lg:justify-center' : 'justify-between'}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-0">
              <span className="text-xl font-bold text-blue-600">KOSMOS</span>
              <span className="text-xl font-bold text-gray-800">CRM</span>
            </div>
          ) : (
            <div className="hidden lg:flex w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white items-center justify-center text-sm font-bold shadow-sm">
              K
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden lg:flex p-1.5 hover:bg-gray-100 rounded-lg transition-colors items-center justify-center ${isCollapsed ? 'absolute top-4 right-2' : ''}`}
            title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-600" /> : <ChevronLeft className="w-4 h-4 text-gray-600" />}
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          {navigationSections.map((section) => {
            const visibleItems = section.items.filter((item) => isItemVisible(item.id))
            if (visibleItems.length === 0) return null
            return (
              <div key={section.id} className={`transition-all ${isCollapsed ? 'mb-2' : 'mb-6'}`}>
                {!isCollapsed && (
                  <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {section.label}
                  </h3>
                )}
                {isCollapsed && visibleItems.length > 0 && (
                  <div className="hidden lg:block w-full h-px bg-gray-200 mb-2" />
                )}
                <ul className={`space-y-1 ${isCollapsed ? 'px-2' : 'px-2'}`}>
                  {visibleItems.map((item) => {
                    const isActive = pathname?.startsWith(item.href)
                    const Icon = iconMap[item.icon]
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={`
                            group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all
                            ${isActive 
                              ? 'bg-blue-50 text-blue-700 shadow-sm' 
                              : 'text-gray-700 hover:bg-gray-50'
                            }
                            ${isCollapsed ? 'lg:justify-center lg:px-2 lg:py-2.5' : 'px-3 py-2.5'}
                          `}
                          title={isCollapsed ? item.label : ''}
                        >
                          {Icon && <Icon className={`flex-shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-5 h-5'}`} />}
                          {!isCollapsed && <span>{item.label}</span>}
                          {isCollapsed && (
                            <div className="hidden lg:group-hover:block absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
                              {item.label}
                              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                            </div>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* User Profile */}
        {user && (
          <div className="p-4 border-t border-gray-200">
            {!isCollapsed ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name || 'Usuario'}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {customRoleName || 
                       (user.role === 'SUPER_ADMIN' ? 'Super Administrador' : 
                        user.role === 'ADMIN' ? 'Administrador' :
                        user.role === 'MANAGER' ? 'Gerente' :
                        user.role === 'USER' ? 'Usuario' :
                        user.role || 'Sin cargo')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span>Cerrar Sesión</span>
                </button>
              </>
            ) : (
              <div className="hidden lg:flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center cursor-pointer" title={user.name || 'Usuario'}>
                  <span className="text-white font-semibold text-sm">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="group relative p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-5 h-5" />
                  <div className="hidden group-hover:block absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
                    Cerrar Sesión
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
