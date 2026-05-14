import { useEffect, useState } from 'react'

interface ModulePermissions {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canExport: boolean
  loading: boolean
}

const permissionsCache = new Map<string, ModulePermissions>()

export function useModulePermissions(moduleName: string): ModulePermissions {
  const [permissions, setPermissions] = useState<ModulePermissions>({
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    loading: true,
  })

  useEffect(() => {
    const fetchPermissions = async () => {
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

      const cacheKey = `${userData.id}-${companyId}-${moduleName}`
      
      if (permissionsCache.has(cacheKey)) {
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
    }

    fetchPermissions()
  }, [moduleName])

  return permissions
}

export function clearPermissionsCache() {
  permissionsCache.clear()
}
