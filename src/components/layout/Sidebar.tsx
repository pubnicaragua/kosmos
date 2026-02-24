'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { navigationSections } from '@/config/navigation'
import { 
  LayoutDashboard, DollarSign, TrendingDown, Clipboard, Users, 
  Filter, Package, HelpCircle, FileText, FileSignature, Settings,
  LogOut, Menu, X, Megaphone
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

      // ADMIN / SUPER_ADMIN / MANAGER get full access
      if (['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(me.role)) {
        setAllowedModules(null)
        setCustomRoleName(null)
        return
      }

      // USER with custom role: apply permissions
      if (me.customRole) {
        const allowed = new Set<string>(
          me.customRole.permissions
            .filter((p: RolePermission) => p.canView)
            .map((p: RolePermission) => p.module)
        )
        setAllowedModules(allowed)
        setCustomRoleName(me.customRole.name)
      } else {
        // Plain USER without custom role: show all
        setAllowedModules(null)
        setCustomRoleName(null)
      }
    } catch (err) {
      console.error('Error loading permissions:', err)
    }
  }, [])

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) setUser(JSON.parse(storedUser))
    loadPermissions()
  }, [loadPermissions])

  // Reload when active company changes (storage event from other tabs or same page)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'activeCompany') loadPermissions()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [loadPermissions])

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
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        w-64
      `}>
        {/* Logo + Toggle */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className={`flex items-center gap-0 transition-opacity ${isCollapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100'}`}>
            <span className="text-xl font-bold text-blue-600">KOSMOS</span>
            <span className="text-xl font-bold text-gray-800">CRM</span>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navigationSections.map((section) => {
            const visibleItems = section.items.filter((item) => isItemVisible(item.id))
            if (visibleItems.length === 0) return null
            return (
              <div key={section.id} className="mb-6">
                <h3 className={`px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider transition-opacity ${isCollapsed ? 'lg:opacity-0 lg:h-0 lg:mb-0' : 'opacity-100'}`}>
                  {section.label}
                </h3>
                <ul className="space-y-1 px-2">
                  {visibleItems.map((item) => {
                    const isActive = pathname?.startsWith(item.href)
                    const Icon = iconMap[item.icon]
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={`
                            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                            ${isActive 
                              ? 'bg-blue-50 text-blue-700 shadow-sm' 
                              : 'text-gray-700 hover:bg-gray-50'
                            }
                            ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}
                          `}
                          title={isCollapsed ? item.label : ''}
                        >
                          {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                          <span className={`transition-opacity ${isCollapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100'}`}>
                            {item.label}
                          </span>
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
            <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? 'lg:justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className={`flex-1 min-w-0 transition-opacity ${isCollapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100'}`}>
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name || 'Usuario'}</p>
                <p className="text-xs text-gray-500 truncate">
                  {customRoleName || 'Gerencia General'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors ${isCollapsed ? 'lg:px-2' : ''}`}
              title={isCollapsed ? 'Cerrar Sesión' : ''}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className={`transition-opacity ${isCollapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100'}`}>
                Cerrar Sesión
              </span>
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
