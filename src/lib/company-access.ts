import { prisma } from '@/lib/prisma'

export async function getAccessibleCompanies(userId: string) {
  const userCompanies = await prisma.userCompany.findMany({
    where: { userId },
    select: { companyId: true, role: true },
  })

  const isSuperAdmin = userCompanies.some((uc) => uc.role === 'SUPER_ADMIN')
  let companyIds = userCompanies.map((uc) => uc.companyId)

  if (isSuperAdmin) {
    const allCompanies = await prisma.company.findMany({ select: { id: true } })
    companyIds = allCompanies.map((c) => c.id)
  }

  return { userCompanies, companyIds, isSuperAdmin }
}

export async function getCompanyAccess(userId: string, companyId: string) {
  const { userCompanies, isSuperAdmin } = await getAccessibleCompanies(userId)
  const membership = userCompanies.find((uc) => uc.companyId === companyId)

  return {
    membership,
    isSuperAdmin,
    canAccess: Boolean(membership) || isSuperAdmin,
    effectiveRole: membership?.role || (isSuperAdmin ? 'SUPER_ADMIN' : null),
  }
}

export async function getModuleAccess(
  userId: string,
  companyId: string,
  module: string
) {
  const { isSuperAdmin } = await getAccessibleCompanies(userId)

  if (isSuperAdmin) {
    return {
      canAccess: true,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
    }
  }

  const userCompany = await prisma.userCompany.findFirst({
    where: { userId, companyId },
    include: {
      customRole: {
        include: {
          permissions: true,
        },
      },
    },
  })

  if (!userCompany) {
    return {
      canAccess: false,
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
      restrictedByCustomRole: false,
    }
  }

  // Dashboard is explicit. No inherited access for non-SUPER_ADMIN users.
  // It must be granted by role/custom role, not by fallback USER access.
  if (module === 'dashboard') {
    const dashboardPerm = userCompany.customRole?.permissions.find((p) => p.module === module)

    if (dashboardPerm) {
      return {
        canAccess: true,
        canView: Boolean(dashboardPerm.canView),
        canCreate: Boolean(dashboardPerm.canCreate),
        canEdit: Boolean(dashboardPerm.canEdit),
        canDelete: Boolean(dashboardPerm.canDelete),
        canExport: Boolean(dashboardPerm.canExport),
        restrictedByCustomRole: true,
      }
    }

    return {
      canAccess: true,
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
      restrictedByCustomRole: Boolean(userCompany.customRole),
    }
  }

  // If user has customRole, check if module has specific permissions
  if (userCompany.customRole) {
    const perm = userCompany.customRole.permissions.find((p) => p.module === module)
    
    // If module found in permissions, use those specific permissions
    if (perm) {
      return {
        canAccess: Boolean(perm.canView || perm.canCreate || perm.canEdit || perm.canDelete || perm.canExport),
        canView: Boolean(perm.canView),
        canCreate: Boolean(perm.canCreate),
        canEdit: Boolean(perm.canEdit),
        canDelete: Boolean(perm.canDelete),
        canExport: Boolean(perm.canExport),
        restrictedByCustomRole: true,
      }
    }
    
    // Module not in customRole permissions - strict mode: deny access
    return {
      canAccess: false,
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
      restrictedByCustomRole: true,
    }
  }

  // No customRole - use default permissions based on role
  const role = userCompany.role
  
  // ADMIN has full access to all modules
  if (role === 'ADMIN') {
    return {
      canAccess: true,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      restrictedByCustomRole: false,
    }
  }

  // MANAGER has view/create/edit/export, no delete
  if (role === 'MANAGER') {
    return {
      canAccess: true,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canExport: true,
      restrictedByCustomRole: false,
    }
  }

  // USER (default) has NO access by default. Must be assigned a custom role.
  return {
    canAccess: false,
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    restrictedByCustomRole: false,
  }
}
