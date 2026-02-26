'use client'

import { useState, useEffect, useCallback, FormEvent } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui-kit/Card'
import { Button } from '@/components/ui-kit/Button'
import { Input } from '@/components/ui-kit/Input'
import { Select } from '@/components/ui-kit/Select'
import { Badge } from '@/components/ui-kit/Badge'
import { 
  LayoutDashboard, Users, DollarSign, Receipt, CheckSquare, Target, 
  FileText, FileSignature, Package, Ticket, Megaphone, FolderOpen, 
  Settings, Shield, Upload, Key, Info 
} from 'lucide-react'

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

interface RolePermission {
  module: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canExport: boolean
}

interface CustomRole {
  id: string
  name: string
  description: string | null
  color: string
  isDefault: boolean
  permissions: RolePermission[]
  userCompanies: { user: { id: string; name: string; email: string } }[]
}

interface CompanyMember {
  id: string
  userId: string
  role: string
  customRoleId: string | null
  user: { id: string; name: string; email: string; avatar: string | null }
  customRole: CustomRole | null
}

interface PredefinedRole {
  name: string
  description: string
  color: string
  modules: Record<string, Partial<RolePermission>>
}

const MODULE_LABELS: Record<string, { label: string; icon: any }> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  clientes: { label: 'Clientes', icon: Users },
  ingresos: { label: 'Ingresos', icon: DollarSign },
  gastos: { label: 'Gastos', icon: Receipt },
  actividades: { label: 'Actividades', icon: CheckSquare },
  'pipeline-ventas': { label: 'Pipeline de Ventas', icon: Target },
  documentos: { label: 'Documentos', icon: FileText },
  contratos: { label: 'Contratos', icon: FileSignature },
  inventario: { label: 'Inventario', icon: Package },
  'tickets-soporte': { label: 'Tickets de Soporte', icon: Ticket },
  marketing: { label: 'Marketing', icon: Megaphone },
  entregables: { label: 'Entregables', icon: FolderOpen },
  sistema: { label: 'Sistema', icon: Settings },
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-orange-100 text-orange-700',
  MANAGER: 'bg-green-100 text-green-700',
  USER: 'bg-gray-100 text-gray-600',
}

const FALLBACK_MODULES = ['dashboard','clientes','ingresos','gastos','actividades','pipeline-ventas','documentos','contratos','inventario','tickets-soporte','marketing','entregables','recursos-humanos','sistema']

const FALLBACK_PREDEFINED_ROLES: PredefinedRole[] = [
  { name: 'Vendedor', description: 'Acceso a clientes, pipeline y cotizaciones', color: '#10b981', modules: { clientes: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false }, 'pipeline-ventas': { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false }, actividades: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false }, dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false } } },
  { name: 'RRHH', description: 'Gestión de personal y actividades internas', color: '#f59e0b', modules: { actividades: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true }, documentos: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true }, contratos: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true }, dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false } } },
  { name: 'Inventario', description: 'Control de productos e inventario', color: '#8b5cf6', modules: { inventario: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true }, dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false } } },
  { name: 'Contabilidad', description: 'Acceso a ingresos, gastos y reportes financieros', color: '#3b82f6', modules: { ingresos: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true }, gastos: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true }, contratos: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true }, dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true } } },
  { name: 'Marketing', description: 'Gestión de campañas y entregables', color: '#ec4899', modules: { marketing: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true }, entregables: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true }, clientes: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false }, dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false } } },
  { name: 'Soporte', description: 'Gestión de tickets de soporte', color: '#ef4444', modules: { 'tickets-soporte': { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true }, clientes: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false }, dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false } } },
]

type Tab = 'perfil' | 'empresa' | 'usuarios' | 'roles'

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

  // Roles state
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [modules, setModules] = useState<string[]>([])
  const [predefinedRoles, setPredefinedRoles] = useState<PredefinedRole[]>([])
  const [members, setMembers] = useState<CompanyMember[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesCompanyId, setRolesCompanyId] = useState('')
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null)
  const [roleForm, setRoleForm] = useState({ name: '', description: '', color: '#6366f1' })
  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermission>>({})
  const [savingRole, setSavingRole] = useState(false)
  const [roleMsg, setRoleMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [addUserEmail, setAddUserEmail] = useState('')
  const [addUserRole, setAddUserRole] = useState('USER')
  const [addUserCustomRoleId, setAddUserCustomRoleId] = useState('')
  const [addingUser, setAddingUser] = useState(false)
  const [addUserMsg, setAddUserMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [fromPredefined, setFromPredefined] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const handleUploadFile = async (file: File, type: 'avatar' | 'logo') => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      alert('Sesión expirada. Por favor inicia sesión nuevamente.')
      return null
    }
    
    // Validar tamaño antes de subir
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert('El archivo es demasiado grande. Tamaño máximo: 5MB')
      return null
    }
    
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, GIF, WEBP)')
      return null
    }
    
    if (type === 'avatar') setUploadingAvatar(true)
    else setUploadingLogo(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      
      const data = await res.json()
      if (data.success) {
        if (type === 'logo') {
          setCompanyMsg({ type: 'success', text: 'Logo subido correctamente. Recuerda guardar los cambios.' })
        } else {
          setProfileMsg({ type: 'success', text: 'Avatar subido correctamente. Recuerda guardar los cambios.' })
        }
        return data.data.url
      } else {
        const errorMsg = data.error || 'Error al subir archivo'
        if (type === 'logo') {
          setCompanyMsg({ type: 'error', text: errorMsg })
        } else {
          setProfileMsg({ type: 'error', text: errorMsg })
        }
        return null
      }
    } catch (err) {
      console.error('Upload error:', err)
      const errorMsg = 'Error de conexión al subir archivo'
      if (type === 'logo') {
        setCompanyMsg({ type: 'error', text: errorMsg })
      } else {
        setProfileMsg({ type: 'error', text: errorMsg })
      }
      return null
    } finally {
      if (type === 'avatar') setUploadingAvatar(false)
      else setUploadingLogo(false)
    }
  }

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

  const fetchRolesData = useCallback(async (cId: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token || !cId) return
    setRolesLoading(true)
    try {
      const [rolesRes, membersRes] = await Promise.all([
        fetch(`/api/roles?companyId=${cId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/companies/${cId}/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const rolesData = await rolesRes.json()
      const membersData = await membersRes.json()
      if (rolesData.success) {
        setRoles(rolesData.data.roles || [])
        setModules(rolesData.data.modules?.length ? rolesData.data.modules : FALLBACK_MODULES)
        setPredefinedRoles(rolesData.data.predefinedRoles?.length ? rolesData.data.predefinedRoles : FALLBACK_PREDEFINED_ROLES)
      } else {
        console.error('Roles API error:', rolesData.error || rolesData.message)
        setModules(FALLBACK_MODULES)
        setPredefinedRoles(FALLBACK_PREDEFINED_ROLES)
        setRoles([])
      }
      if (membersData.success) setMembers(membersData.data)
    } catch (err) {
      console.error('Error fetching roles data:', err)
      setModules(FALLBACK_MODULES)
      setPredefinedRoles(FALLBACK_PREDEFINED_ROLES)
    } finally {
      setRolesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'roles' && rolesCompanyId) {
      fetchRolesData(rolesCompanyId)
    }
  }, [activeTab, rolesCompanyId, fetchRolesData])

  useEffect(() => {
    if (companies.length > 0 && !rolesCompanyId) {
      const active = JSON.parse(localStorage.getItem('activeCompany') || '{}')
      const defaultId = active?.id && companies.find((c) => c.id === active.id)
        ? active.id : companies[0].id
      setRolesCompanyId(defaultId)
    }
  }, [companies, rolesCompanyId])

  const openNewRole = () => {
    setEditingRole(null)
    setRoleForm({ name: '', description: '', color: '#6366f1' })
    setFromPredefined('')
    const emptyPerms: Record<string, RolePermission> = {}
    modules.forEach((m) => { emptyPerms[m] = { module: m, canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false } })
    setRolePermissions(emptyPerms)
    setRoleMsg(null)
    setShowRoleModal(true)
  }

  const openEditRole = (role: CustomRole) => {
    setEditingRole(role)
    setRoleForm({ name: role.name, description: role.description || '', color: role.color || '#6366f1' })
    setFromPredefined('')
    const perms: Record<string, RolePermission> = {}
    modules.forEach((m) => {
      const existing = role.permissions.find((p) => p.module === m)
      perms[m] = existing || { module: m, canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false }
    })
    setRolePermissions(perms)
    setRoleMsg(null)
    setShowRoleModal(true)
  }

  const applyPredefined = (name: string) => {
    setFromPredefined(name)
    const found = predefinedRoles.find((r) => r.name === name)
    if (!found) return
    setRoleForm((prev) => ({ ...prev, name: prev.name || found.name, description: prev.description || found.description, color: found.color }))
    const newPerms: Record<string, RolePermission> = {}
    modules.forEach((m) => {
      const pre = found.modules[m]
      newPerms[m] = { module: m, canView: pre?.canView ?? false, canCreate: pre?.canCreate ?? false, canEdit: pre?.canEdit ?? false, canDelete: pre?.canDelete ?? false, canExport: pre?.canExport ?? false }
    })
    setRolePermissions(newPerms)
  }

  const togglePerm = (module: string, field: keyof Omit<RolePermission, 'module'>) => {
    setRolePermissions((prev) => {
      const currentValue = prev[module][field]
      const newValue = !currentValue
      
      // Lógica de permisos dependientes:
      // Si se activa canCreate, canEdit, canDelete o canExport → activar canView automáticamente
      const needsView = ['canCreate', 'canEdit', 'canDelete', 'canExport'].includes(field)
      
      return {
        ...prev,
        [module]: {
          ...prev[module],
          [field]: newValue,
          // Auto-activar canView si se activa un permiso que lo requiere
          ...(needsView && newValue ? { canView: true } : {}),
        },
      }
    })
  }

  const handleSaveRole = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !rolesCompanyId) return
    if (!roleForm.name.trim()) { setRoleMsg({ type: 'error', text: 'El nombre del rol es requerido' }); return }
    setSavingRole(true)
    setRoleMsg(null)
    const permissionsArray = Object.values(rolePermissions)
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles'
      const method = editingRole ? 'PUT' : 'POST'
      const body = editingRole
        ? { name: roleForm.name, description: roleForm.description, color: roleForm.color, permissions: permissionsArray }
        : { companyId: rolesCompanyId, name: roleForm.name, description: roleForm.description, color: roleForm.color, permissions: permissionsArray }
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) {
        setRoleMsg({ type: 'success', text: editingRole ? 'Rol actualizado' : 'Rol creado exitosamente' })
        await fetchRolesData(rolesCompanyId)
        setTimeout(() => { setShowRoleModal(false); setRoleMsg(null) }, 800)
      } else {
        setRoleMsg({ type: 'error', text: data.error || 'Error al guardar rol' })
      }
    } catch { setRoleMsg({ type: 'error', text: 'Error de conexión' }) }
    finally { setSavingRole(false) }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('¿Eliminar este rol? Los usuarios asignados perderán el rol personalizado.')) return
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      await fetch(`/api/roles/${roleId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      await fetchRolesData(rolesCompanyId)
    } catch (err) { console.error(err) }
  }

  const handleAddUser = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !rolesCompanyId || !addUserEmail) return
    setAddingUser(true)
    setAddUserMsg(null)
    try {
      const res = await fetch(`/api/companies/${rolesCompanyId}/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addUserEmail, role: addUserRole, customRoleId: addUserCustomRoleId || null }),
      })
      const data = await res.json()
      if (data.success) {
        setAddUserMsg({ type: 'success', text: 'Usuario agregado correctamente' })
        setAddUserEmail('')
        setAddUserCustomRoleId('')
        await fetchRolesData(rolesCompanyId)
      } else {
        setAddUserMsg({ type: 'error', text: data.error || 'Error al agregar usuario' })
      }
    } catch { setAddUserMsg({ type: 'error', text: 'Error de conexión' }) }
    finally { setAddingUser(false) }
  }

  const handleChangePassword = async (userId: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token || !newPassword || newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        alert('Contraseña actualizada exitosamente')
        setEditingPasswordUserId(null)
        setNewPassword('')
      } else {
        alert(data.error || 'Error al cambiar contraseña')
      }
    } catch (err) {
      console.error(err)
      alert('Error de conexión')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('¿Remover este usuario de la empresa?')) return
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      await fetch(`/api/companies/${rolesCompanyId}/users?userId=${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      await fetchRolesData(rolesCompanyId)
    } catch (err) { console.error(err) }
  }

  const handleAssignRole = async (userId: string, customRoleId: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      await fetch('/api/roles/assign', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, companyId: rolesCompanyId, customRoleId: customRoleId || null }),
      })
      await fetchRolesData(rolesCompanyId)
    } catch (err) { console.error(err) }
  }

  const getRoleBadge = (role: string) => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      SUPER_ADMIN: 'error',
      ADMIN: 'warning',
      MANAGER: 'success',
      USER: 'default',
    }
    return <Badge variant={map[role] || 'default'}>{role}</Badge>
  }

  const canEditCompany = companyData && ['ADMIN', 'SUPER_ADMIN'].includes(companyData.role)
  const isSuperAdmin = companies.some((c) => c.role === 'SUPER_ADMIN')
  const canManageRoles = isSuperAdmin || companies.find((c) => c.id === rolesCompanyId && ['ADMIN', 'SUPER_ADMIN'].includes(c.role))

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
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {([
          { key: 'perfil', label: 'Mi Perfil' },
          { key: 'empresa', label: 'Empresa' },
          { key: 'usuarios', label: 'Mis Empresas' },
          { key: 'roles', label: 'Roles & Permisos', icon: Shield },
        ] as { key: Tab; label: string; icon?: any }[]).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon && (() => { const Icon = icon; return <Icon className="w-4 h-4" />; })()}
            {label}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
              <div className="flex items-center gap-3">
                <Input
                  label="Avatar URL"
                  placeholder="URL del avatar o sube una imagen..."
                  value={profileForm.avatar}
                  onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                  fullWidth
                />
                <div>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const url = await handleUploadFile(file, 'avatar')
                        if (url) setProfileForm({ ...profileForm, avatar: url })
                      }
                    }}
                    disabled={uploadingAvatar}
                  />
                  <label htmlFor="avatar-upload" className="cursor-pointer inline-block">
                    <span className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${
                      uploadingAvatar 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}>
                      <Upload className="w-4 h-4 mr-1" />
                      {uploadingAvatar ? 'Subiendo...' : 'Subir'}
                    </span>
                  </label>
                </div>
              </div>
              {profileForm.avatar && (
                <div className="mt-2">
                  <Image src={profileForm.avatar} alt="Avatar preview" width={64} height={64} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                </div>
              )}
            </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo de la empresa</label>
                <div className="flex gap-2 items-end">
                  <Input
                    placeholder="URL del logo o sube una imagen..."
                    value={companyForm.logo}
                    onChange={(e) => setCompanyForm({ ...companyForm, logo: e.target.value })}
                    fullWidth
                    disabled={!canEditCompany}
                  />
                  <div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = await handleUploadFile(file, 'logo')
                          if (url) setCompanyForm({ ...companyForm, logo: url })
                        }
                      }}
                      disabled={!canEditCompany || uploadingLogo}
                    />
                    <label htmlFor="logo-upload" className="cursor-pointer inline-block">
                      <span className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${
                        !canEditCompany || uploadingLogo
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}>
                        <Upload className="w-4 h-4 mr-1" />
                        {uploadingLogo ? 'Subiendo...' : 'Subir'}
                      </span>
                    </label>
                  </div>
                </div>
                {companyForm.logo && (
                  <div className="mt-2">
                    <Image src={companyForm.logo} alt="Logo preview" width={150} height={48} className="h-12 object-contain border border-gray-200 rounded p-2" />
                  </div>
                )}
              </div>
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

      {/* TAB: Usuarios (mis empresas) */}
      {activeTab === 'usuarios' && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Mis Empresas & Roles Asignados</h2>
          <div className="space-y-3">
            {companies.map((company) => (
              <div key={company.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{company.name}</p>
                  {company.industry && <p className="text-sm text-gray-500">{company.industry}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {getRoleBadge(company.role)}
                  <Badge variant={company.isActive ? 'success' : 'default'}>
                    {company.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB: Roles & Permisos */}
      {activeTab === 'roles' && (
        <div className="space-y-5">
          {/* Selector empresa */}
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <Select
                label="Empresa"
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
                value={rolesCompanyId}
                onChange={(e) => setRolesCompanyId(e.target.value)}
                className="w-64"
              />
              {canManageRoles && (
                <div className="mt-5">
                  <Button onClick={openNewRole}>+ Nuevo Rol</Button>
                </div>
              )}
              {!canManageRoles && (
                <p className="mt-5 text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">Solo ADMIN/SUPER_ADMIN pueden gestionar roles</p>
              )}
            </div>
          </Card>

          {rolesLoading ? (
            <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Panel izquierdo: Roles existentes */}
              <Card>
                <h3 className="font-semibold text-gray-900 mb-4">Roles de la Empresa <span className="text-gray-400 font-normal text-sm">({roles.length})</span></h3>
                {roles.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Shield className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No hay roles personalizados aún</p>
                    {canManageRoles && <button onClick={openNewRole} className="mt-3 text-primary text-sm underline">Crear primer rol</button>}
                  </div>
                )}
                <div className="space-y-3">
                  {roles.map((role) => (
                    <div key={role.id} className="border border-gray-200 rounded-xl p-4 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: role.color }} />
                          <div>
                            <p className="font-medium text-gray-900">{role.name}</p>
                            {role.description && <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>}
                            <p className="text-xs text-gray-400 mt-1">
                              {role.permissions.length} módulos · {role.userCompanies.length} usuario(s)
                            </p>
                          </div>
                        </div>
                        {canManageRoles && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => openEditRole(role)} className="text-xs text-blue-600 hover:underline">Editar</button>
                            <button onClick={() => handleDeleteRole(role.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                          </div>
                        )}
                      </div>
                      {/* Permisos resumen */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {role.permissions.filter(p => p.canView).map((p) => {
                          const moduleInfo = MODULE_LABELS[p.module]
                          const Icon = moduleInfo?.icon
                          return (
                            <span key={p.module} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              {Icon && <Icon className="w-3 h-3" />}
                              {moduleInfo?.label || p.module}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Roles predefinidos sugeridos */}
                {canManageRoles && predefinedRoles.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Roles predefinidos disponibles</p>
                    <div className="flex flex-wrap gap-2">
                      {predefinedRoles.map((pr) => (
                        <button
                          key={pr.name}
                          onClick={() => { openNewRole(); setTimeout(() => applyPredefined(pr.name), 50) }}
                          className="text-xs px-3 py-1.5 rounded-full border border-dashed border-gray-300 hover:border-primary hover:text-primary transition-colors"
                          style={{ borderColor: pr.color + '80', color: pr.color }}
                        >
                          + {pr.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Panel derecho: Usuarios de la empresa */}
              <Card>
                <h3 className="font-semibold text-gray-900 mb-4">Usuarios <span className="text-gray-400 font-normal text-sm">({members.length})</span></h3>

                {/* Agregar usuario */}
                {canManageRoles && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Agregar usuario</p>
                    <input
                      type="email"
                      placeholder="Email del usuario"
                      value={addUserEmail}
                      onChange={(e) => setAddUserEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Rol base</label>
                      <select
                        value={addUserRole}
                        onChange={(e) => setAddUserRole(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="USER">USER - Acceso limitado según permisos</option>
                        <option value="MANAGER">MANAGER - Gestión de equipo y reportes</option>
                        <option value="ADMIN">ADMIN - Administración completa de empresa</option>
                      </select>
                      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-500">
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <p>El rol base define el nivel de acceso general. Puedes refinar permisos con roles personalizados.</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Rol personalizado (opcional)</label>
                      <select
                        value={addUserCustomRoleId}
                        onChange={(e) => setAddUserCustomRoleId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Sin rol personalizado</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    {addUserMsg && (
                      <p className={`text-xs ${addUserMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{addUserMsg.text}</p>
                    )}
                    <Button onClick={handleAddUser} disabled={addingUser || !addUserEmail} className="w-full">
                      {addingUser ? 'Agregando...' : 'Agregar Usuario'}
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="border border-gray-100 rounded-xl hover:bg-gray-50">
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                          {m.user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{m.user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{m.user.email}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE_COLORS[m.role] || 'bg-gray-100 text-gray-600'}`}>
                              {m.role}
                            </span>
                            {m.customRole && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: m.customRole.color }}>
                                {m.customRole.name}
                              </span>
                            )}
                          </div>
                        </div>
                        {canManageRoles && (
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <select
                              value={m.customRoleId || ''}
                              onChange={(e) => handleAssignRole(m.userId, e.target.value)}
                              className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                            >
                              <option value="">Sin rol</option>
                              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            <button
                              onClick={() => setEditingPasswordUserId(editingPasswordUserId === m.userId ? null : m.userId)}
                              className="text-xs text-blue-500 hover:text-blue-700 text-center flex items-center justify-center gap-1"
                              title="Asignar nueva contraseña para este usuario"
                            >
                              <Key className="w-3 h-3" />
                              Contraseña
                            </button>
                            <button
                              onClick={() => handleRemoveUser(m.userId)}
                              className="text-xs text-red-400 hover:text-red-600 text-center"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                      {editingPasswordUserId === m.userId && canManageRoles && (
                        <div className="px-3 pb-3 pt-0 border-t border-gray-100 mt-2">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2 mt-2">
                            <div className="flex items-start gap-1.5">
                              <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-blue-700">Asignarás una nueva contraseña para <strong>{m.user.name}</strong>. El usuario podrá iniciar sesión con esta contraseña.</p>
                            </div>
                          </div>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña</label>
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                            </div>
                            <button
                              onClick={() => handleChangePassword(m.userId)}
                              disabled={changingPassword || newPassword.length < 6}
                              className="px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {changingPassword ? 'Guardando...' : 'Cambiar'}
                            </button>
                            <button
                              onClick={() => { setEditingPasswordUserId(null); setNewPassword('') }}
                              className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Crear/Editar Rol */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-900">{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</h2>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Plantillas predefinidas */}
              {!editingRole && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Partir de una plantilla</p>
                  <div className="flex flex-wrap gap-2">
                    {predefinedRoles.map((pr) => (
                      <button
                        key={pr.name}
                        onClick={() => applyPredefined(pr.name)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${fromPredefined === pr.name ? 'text-white font-semibold shadow' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                        style={fromPredefined === pr.name ? { backgroundColor: pr.color, borderColor: pr.color } : {}}
                      >
                        {pr.name}
                      </button>
                    ))}
                    <button
                      onClick={() => { setFromPredefined(''); const empty: Record<string, RolePermission> = {}; modules.forEach(m => { empty[m] = { module: m, canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false } }); setRolePermissions(empty) }}
                      className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-500 hover:border-gray-400"
                    >
                      Personalizado
                    </button>
                  </div>
                </div>
              )}

              {/* Nombre, descripción, color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del rol *</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="Ej: Vendedor, RRHH..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={roleForm.color}
                      onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                      className="w-10 h-9 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={roleForm.color}
                      onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Breve descripción del rol..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Tabla de permisos por módulo */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Permisos por Módulo</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Módulo</th>
                        {['Ver', 'Crear', 'Editar', 'Eliminar', 'Exportar'].map(h => (
                          <th key={h} className="text-center px-2 py-2.5 font-semibold text-gray-600 text-xs">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((mod, i) => {
                        const p = rolePermissions[mod] || { module: mod, canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false }
                        const moduleInfo = MODULE_LABELS[mod]
                        const Icon = moduleInfo?.icon
                        return (
                          <tr key={mod} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className="px-4 py-2.5 font-medium text-gray-700">
                              <div className="flex items-center gap-2">
                                {Icon && <Icon className="w-4 h-4 text-gray-400" />}
                                {moduleInfo?.label || mod}
                              </div>
                            </td>
                            {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canExport'] as const).map(field => (
                              <td key={field} className="text-center px-2 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={!!p[field]}
                                  onChange={() => togglePerm(mod, field)}
                                  className="w-4 h-4 rounded text-primary border-gray-300 cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => { const all: Record<string, RolePermission> = {}; modules.forEach(m => { all[m] = { module: m, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true } }); setRolePermissions(all) }}
                    className="text-xs text-primary hover:underline"
                  >Marcar todo</button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => { const none: Record<string, RolePermission> = {}; modules.forEach(m => { none[m] = { module: m, canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false } }); setRolePermissions(none) }}
                    className="text-xs text-gray-500 hover:underline"
                  >Desmarcar todo</button>
                </div>
              </div>

              {roleMsg && (
                <div className={`p-3 rounded-lg text-sm ${roleMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {roleMsg.text}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowRoleModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg">
                Cancelar
              </button>
              <Button onClick={handleSaveRole} disabled={savingRole}>
                {savingRole ? 'Guardando...' : editingRole ? 'Actualizar Rol' : 'Crear Rol'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
