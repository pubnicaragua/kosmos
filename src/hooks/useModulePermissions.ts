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
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
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
      const companyId = localStorage.getItem('selectedCompany')
      
      if (!companyId || companyId === 'all') {
        setPermissions({
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canExport: true,
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
          const data = await response.json()
          const perms = {
            canView: data.canView ?? true,
            canCreate: data.canCreate ?? true,
            canEdit: data.canEdit ?? true,
            canDelete: data.canDelete ?? true,
            canExport: data.canExport ?? true,
            loading: false,
          }
          permissionsCache.set(cacheKey, perms)
          setPermissions(perms)
        } else {
          setPermissions({
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canExport: true,
            loading: false,
          })
        }
      } catch (error) {
        console.error('Error fetching permissions:', error)
        setPermissions({
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canExport: true,
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
