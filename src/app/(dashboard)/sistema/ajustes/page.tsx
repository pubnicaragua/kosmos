'use client'

import { useState, useEffect, useCallback, FormEvent } from 'react'
import { Card } from '@/components/ui-kit/Card'
import { Button } from '@/components/ui-kit/Button'
import { Input } from '@/components/ui-kit/Input'
import { Select } from '@/components/ui-kit/Select'
import { Badge } from '@/components/ui-kit/Badge'

interface UserProfile {
  id: string
  email: string
  name: string
  avatar: string | null
}

interface CompanyProfile {
  id: string
  name: string
  industry: string | null
  logo: string | null
  isActive: boolean
  role: string
}

type Tab = 'perfil' | 'empresa' | 'usuarios'

export default function AjustesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('perfil')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [companies, setCompanies] = useState<CompanyProfile[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [companyData, setCompanyData] = useState<CompanyProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingCompany, setIsSavingCompany] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [companyMsg, setCompanyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [profileForm, setProfileForm] = useState({ name: '', avatar: '' })
  const [companyForm, setCompanyForm] = useState({ name: '', industry: '', logo: '', isActive: true })

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const res = await fetch('/api/profiles/current', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.data.user)
        setProfileForm({ name: data.data.user.name || '', avatar: data.data.user.avatar || '' })
        const companiesWithRole: CompanyProfile[] = data.data.companies
        setCompanies(companiesWithRole)
        if (companiesWithRole.length > 0 && !selectedCompanyId) {
          const active = JSON.parse(localStorage.getItem('activeCompany') || '{}')
          const defaultId = active?.id && companiesWithRole.find((c) => c.id === active.id)
            ? active.id
            : companiesWithRole[0].id
          setSelectedCompanyId(defaultId)
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    if (!selectedCompanyId) return
    const company = companies.find((c) => c.id === selectedCompanyId)
    if (company) {
      setCompanyData(company)
      setCompanyForm({
        name: company.name,
        industry: company.industry || '',
        logo: company.logo || '',
        isActive: company.isActive,
      })
    }
  }, [selectedCompanyId, companies])

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setIsSavingProfile(true)
    setProfileMsg(null)
    try {
      const res = await fetch('/api/profiles/current', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileForm.name, avatar: profileForm.avatar || null }),
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.data)
        const stored = localStorage.getItem('user')
        if (stored) {
          const parsed = JSON.parse(stored)
          localStorage.setItem('user', JSON.stringify({ ...parsed, name: data.data.name, avatar: data.data.avatar }))
        }
        setProfileMsg({ type: 'success', text: 'Perfil actualizado correctamente' })
      } else {
        setProfileMsg({ type: 'error', text: data.error || 'Error al actualizar perfil' })
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Error de conexión' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSaveCompany = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    if (!token || !selectedCompanyId) return
    setIsSavingCompany(true)
    setCompanyMsg(null)
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyForm.name,
          industry: companyForm.industry || null,
          logo: companyForm.logo || null,
          isActive: companyForm.isActive,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === selectedCompanyId
              ? { ...c, name: data.data.name, industry: data.data.industry, logo: data.data.logo, isActive: data.data.isActive }
              : c
          )
        )
        setCompanyMsg({ type: 'success', text: 'Empresa actualizada correctamente' })
      } else {
        setCompanyMsg({ type: 'error', text: data.error || 'Error al actualizar empresa' })
      }
    } catch {
      setCompanyMsg({ type: 'error', text: 'Error de conexión' })
    } finally {
      setIsSavingCompany(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      SUPER_ADMIN: 'error',
      ADMIN: 'warning',
      USER: 'default',
    }
    return <Badge variant={map[role] || 'default'}>{role}</Badge>
  }

  const canEditCompany = companyData && ['ADMIN', 'SUPER_ADMIN'].includes(companyData.role)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-64 bg-slate-200 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Ajustes</h1>
        <p className="text-sm text-gray-500 mt-1">Configura tu perfil, empresa y preferencias del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['perfil', 'empresa', 'usuarios'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'perfil' ? 'Mi Perfil' : tab === 'empresa' ? 'Empresa' : 'Usuarios & Roles'}
          </button>
        ))}
      </div>

      {/* TAB: Perfil */}
      {activeTab === 'perfil' && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Información Personal</h2>
          <form onSubmit={handleSaveProfile} className="space-y-5 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input
                type="text"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">El correo no puede modificarse</p>
            </div>
            <Input
              label="Nombre completo"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              required
              fullWidth
            />
            <Input
              label="URL de avatar (opcional)"
              value={profileForm.avatar}
              onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
              placeholder="https://..."
              fullWidth
            />
            {profileMsg && (
              <div className={`p-3 rounded-lg text-sm ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {profileMsg.text}
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? 'Guardando...' : 'Guardar Perfil'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB: Empresa */}
      {activeTab === 'empresa' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-4 mb-6">
              <Select
                label="Empresa a configurar"
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-72"
              />
              {companyData && getRoleBadge(companyData.role)}
            </div>

            {!canEditCompany && (
              <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm mb-4">
                Solo los administradores pueden editar los datos de la empresa.
              </div>
            )}

            <form onSubmit={handleSaveCompany} className="space-y-5 max-w-lg">
              <Input
                label="Nombre de la empresa"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                required
                fullWidth
                disabled={!canEditCompany}
              />
              <Input
                label="Industria / Sector"
                value={companyForm.industry}
                onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                placeholder="Ej: Tecnología, Retail, Servicios..."
                fullWidth
                disabled={!canEditCompany}
              />
              <Input
                label="URL del logo (opcional)"
                value={companyForm.logo}
                onChange={(e) => setCompanyForm({ ...companyForm, logo: e.target.value })}
                placeholder="https://..."
                fullWidth
                disabled={!canEditCompany}
              />
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={companyForm.isActive}
                  onChange={(e) => setCompanyForm({ ...companyForm, isActive: e.target.checked })}
                  disabled={!canEditCompany}
                  className="w-4 h-4 text-primary rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Empresa activa
                </label>
              </div>
              {companyMsg && (
                <div className={`p-3 rounded-lg text-sm ${companyMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {companyMsg.text}
                </div>
              )}
              {canEditCompany && (
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSavingCompany}>
                    {isSavingCompany ? 'Guardando...' : 'Guardar Empresa'}
                  </Button>
                </div>
              )}
            </form>
          </Card>
        </div>
      )}

      {/* TAB: Usuarios */}
      {activeTab === 'usuarios' && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Usuarios & Roles por Empresa</h2>
          <div className="space-y-4">
            {companies.map((company) => (
              <div key={company.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{company.name}</p>
                    {company.industry && (
                      <p className="text-sm text-gray-500">{company.industry}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {getRoleBadge(company.role)}
                    <Badge variant={company.isActive ? 'success' : 'default'}>
                      {company.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 font-medium">Gestión de usuarios</p>
            <p className="text-sm text-blue-600 mt-1">
              Para agregar o eliminar usuarios de una empresa, contacta al administrador del sistema (SUPER_ADMIN).
              Los roles disponibles son: <strong>SUPER_ADMIN</strong>, <strong>ADMIN</strong>, <strong>USER</strong>.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
