import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ModulePermissions {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canExport: boolean
  loading: boolean
}

interface UseModulePermissionsOptions {
  requireAction?: 'view' | 'create' | 'edit' | 'delete' | 'export'
  redirectTo?: string
}

const permissionsCache = new Map<string, ModulePermissions>()

export function useModulePermissions(
  moduleName: string,
  options?: UseModulePermissionsOptions
): ModulePermissions {
  const router = useRouter()
  const [permissions, setPermissions] = useState<ModulePermissions>({
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    loading: true,
  })

  const fetchPermissions = useCallback(async () => {
    const user = localStorage.getItem('user')
    if (!user) {
      setPermissions({
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
        loading: false,
      })
      return
    }

    const userData = JSON.parse(user)
    const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}')
    const companyId = activeCompany?.id

    if (!companyId || companyId === 'all') {
      setPermissions({
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
        loading: false,
      })
      return
    }

    // Cache key con timestamp para invalidar por edad
    const cacheKey = `${userData.id}-${companyId}-${moduleName}`
    const cacheTimestampKey = `${cacheKey}-ts`
    const CACHE_TTL_MS = 30 * 1000 // 30 segundos - evita cache obsoleto tras editar roles

    // Verificar cache solo si es reciente
    const cachedTs = sessionStorage.getItem(cacheTimestampKey)
    const now = Date.now()
    if (cachedTs && (now - parseInt(cachedTs, 10)) < CACHE_TTL_MS && permissionsCache.has(cacheKey)) {
      setPermissions({ ...permissionsCache.get(cacheKey)!, loading: false })
      return
    }

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/permissions/check?module=${moduleName}&companyId=${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        const data = result.data || result
        const perms = {
          canView: Boolean(data.canView),
          canCreate: Boolean(data.canCreate),
          canEdit: Boolean(data.canEdit),
          canDelete: Boolean(data.canDelete),
          canExport: Boolean(data.canExport),
          loading: false,
        }
        permissionsCache.set(cacheKey, perms)
        sessionStorage.setItem(cacheTimestampKey, now.toString())
        setPermissions(perms)
      } else {
        setPermissions({
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canExport: false,
          loading: false,
        })
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      setPermissions({
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
        loading: false,
      })
    }
  }, [moduleName])

  useEffect(() => {
    fetchPermissions()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activeCompany' || e.key === 'user' || e.key === 'permissions-cache-cleared') {
        if (e.key === 'permissions-cache-cleared') {
          // Cache cleared from another tab - clear our local cache and re-fetch
          permissionsCache.clear()
        }
        fetchPermissions()
      }
    }

    const handleCacheCleared = () => {
      fetchPermissions()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('permissionsCacheCleared', handleCacheCleared)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('permissionsCacheCleared', handleCacheCleared)
    }
  }, [fetchPermissions])

  useEffect(() => {
    if (!permissions.loading && options?.requireAction) {
      const actionMap = {
        view: permissions.canView,
        create: permissions.canCreate,
        edit: permissions.canEdit,
        delete: permissions.canDelete,
        export: permissions.canExport,
      }
      
      if (!actionMap[options.requireAction]) {
        router.push(options.redirectTo || '/sistema/unauthorized')
      }
    }
  }, [permissions.loading, permissions, options?.requireAction, options?.redirectTo, router])

  return permissions
}

export function clearPermissionsCache() {
  permissionsCache.clear()
  if (typeof window !== 'undefined') {
    // Limpiar también los timestamps de sessionStorage
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.endsWith('-ts')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k))
    } catch {}
    // Sincronizar entre pestañas via localStorage
    try {
      localStorage.setItem('permissions-cache-cleared', Date.now().toString())
    } catch {}
    window.dispatchEvent(new Event('permissionsCacheCleared'))
  }
}
