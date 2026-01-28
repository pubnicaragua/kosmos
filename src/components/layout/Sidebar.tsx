'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { navigationItems } from '@/config/navigation'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('activeCompany')
    localStorage.removeItem('rememberMe')
    router.push('/login')
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4">
        <div className="flex items-center gap-0">
          <span className="text-xl font-semibold text-primary-light">Kosmos</span>
          <span className="text-xl font-semibold text-primary-dark">CRM</span>
        </div>
      </div>
      
      <nav className="mt-4 flex-1">
        <ul className="space-y-1 px-2">
          {navigationItems.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            const isEntregables = item.id === 'deliverables'
            
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`
                    block px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? isEntregables 
                        ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200' 
                        : 'bg-blue-50 text-blue-700'
                      : isEntregables
                        ? 'text-purple-700 hover:bg-purple-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Botón de Cerrar Sesión */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
