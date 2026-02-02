'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
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

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

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
        w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-0">
            <span className="text-xl font-bold text-blue-600">CORP</span>
            <span className="text-xl font-bold text-gray-800">CRM</span>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navigationSections.map((section) => (
            <div key={section.id} className="mb-6">
              <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.label}
              </h3>
              <ul className="space-y-1 px-2">
                {section.items.map((item) => {
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
                        `}
                      >
                        {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        {user && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name || 'Usuario'}</p>
                <p className="text-xs text-gray-500 truncate">Gerencia General</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
