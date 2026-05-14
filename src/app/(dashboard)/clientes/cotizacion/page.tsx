'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useModulePermissions } from '@/hooks/useModulePermissions'
import { Button } from '@/components/ui-kit/Button'
import { Select } from '@/components/ui-kit/Select'
import { SkeletonTable } from '@/components/ui-kit/Skeleton'

interface Quote {
  id: string
  quoteNumber: string
  client: { id: string; name: string }
  company: { id: string; name: string }
  currency: string
  total: number
  status: string
  validUntil: string
  createdAt: string
  createdByUser?: { name: string }
}

interface Company {
  id: string
  name: string
}

export default function CotizacionesList() {
  const router = useRouter()
  const permissions = useModulePermissions('cotizaciones')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      try {
        // Get user role
        const userRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const userData = await userRes.json()
        if (userData.success) {
          setUserRole(userData.data.role || 'USER')
        }

        // Get companies
        const companiesRes = await fetch('/api/companies', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const companiesData = await companiesRes.json()
        if (companiesData.success) {
          setCompanies(companiesData.data)
        }

        // Get quotes
        await fetchQuotes(token, selectedCompany)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      fetchQuotes(token, selectedCompany)
    }
  }, [selectedCompany])

  const fetchQuotes = async (token: string, companyId: string) => {
    try {
      const params = new URLSearchParams()
      if (companyId !== 'all') params.append('companyId', companyId)
      
      const response = await fetch(`/api/quotes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setQuotes(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
    }
  }

  const handleViewQuote = (quoteId: string) => {
    router.push(`/clientes/cotizacion/${quoteId}`)
  }

  const handleEditQuote = (quoteId: string) => {
    router.push(`/clientes/cotizacion/${quoteId}/editar`)
  }

  if (isLoading) {
    return <SkeletonTable />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <button onClick={() => router.push('/clientes')} className="hover:text-primary">CLIENTES</button>
            <span>&gt;</span>
            <span className="text-primary font-medium">COTIZACIONES</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Cotizaciones</h1>
          <p className="text-sm text-gray-500 mt-1">Lista de todas las cotizaciones creadas</p>
        </div>
        <div className="flex items-center gap-3">
          {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
            <Select
              options={[
                { value: 'all', label: 'Todas las empresas' },
                ...companies.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-64"
            />
          )}
          {permissions.canCreate && (
            <Button onClick={() => router.push('/clientes/cotizacion/nueva')}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Cotización
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Válida hasta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado por</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No hay cotizaciones registradas
                </td>
              </tr>
            ) : (
              quotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {quote.quoteNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {quote.client.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {quote.company.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {quote.currency === 'NIO' ? 'C$' : '$'}
                    {quote.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      quote.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      quote.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      quote.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {quote.status === 'APPROVED' ? 'Aprobada' :
                       quote.status === 'PENDING' ? 'Pendiente' :
                       quote.status === 'REJECTED' ? 'Rechazada' :
                       quote.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(quote.validUntil).toLocaleDateString('es-NI')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {quote.createdByUser?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewQuote(quote.id)}
                      className="text-primary hover:text-primary/80 mr-3"
                    >
                      Ver
                    </button>
                    {permissions.canEdit && (
                      <button
                        onClick={() => handleEditQuote(quote.id)}
                        className="text-primary hover:text-primary/80"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
