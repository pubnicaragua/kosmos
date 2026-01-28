'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/common/Logo'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'

interface Company {
  id: string
  name: string
  logo?: string
  isActive: boolean
  role: string
  createdAt?: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }

    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/login')
      return
    }

    fetch('/api/companies', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCompanies(data.data)
        }
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [router])

  const handleSelectCompany = async () => {
    if (!selectedCompany) return

    const token = localStorage.getItem('accessToken')
    try {
      const response = await fetch('/api/companies/select', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId: selectedCompany }),
      })

      const data = await response.json()
      if (data.success) {
        localStorage.setItem('activeCompany', JSON.stringify(data.data.company))
        router.push('/dashboards')
      }
    } catch (error) {
      console.error('Error selecting company:', error)
    }
  }

  const canAccessSuperAdmin = user && companies.some(c => c.role === 'SUPER_ADMIN')

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="w-full py-6 px-4 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <Logo />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-8">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h1 className="text-2xl font-medium text-primary">
                Elige una empresa
              </h1>
            </div>

            {canAccessSuperAdmin && (
              <div className="mb-6 flex justify-end">
                <Button variant="outline" size="sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  VISTA DE PANEL SUPER ADMIN
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => setSelectedCompany(company.id)}
                  className={`
                    border-2 rounded-lg p-6 cursor-pointer transition-all
                    ${selectedCompany === company.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{company.name}</h3>
                        <p className="text-sm text-gray-500 uppercase mt-1">
                          FECHA DE CREACIÓN
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={company.isActive ? 'success' : 'default'}>
                        {company.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                      {company.createdAt && (
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(company.createdAt).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {companies.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No tienes empresas asignadas
              </div>
            )}

            {companies.length > 0 && (
              <div className="mt-8 flex justify-end">
                <Button
                  onClick={handleSelectCompany}
                  disabled={!selectedCompany}
                  size="lg"
                >
                  Continuar
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full py-6 px-4 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-end gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-gray-700">Soporte</a>
          <a href="#" className="hover:text-gray-700">Privacidad</a>
          <a href="#" className="hover:text-gray-700">Términos</a>
        </div>
        <div className="max-w-7xl mx-auto mt-2 text-xs text-gray-400 text-left">
          © 2026 KosmosCRM. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}
