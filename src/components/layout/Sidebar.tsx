'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navigationItems } from '@/config/navigation'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <div className="flex items-center gap-0">
          <span className="text-xl font-semibold text-primary-light">CORP</span>
          <span className="text-xl font-semibold text-primary-dark">CRM</span>
        </div>
      </div>
      
      <nav className="mt-4">
        <ul className="space-y-1 px-2">
          {navigationItems.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`
                    block px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700' 
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
    </aside>
  )
}
