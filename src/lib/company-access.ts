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

  // If user has customRole, use its permissions
  if (userCompany.customRole) {
    const perm = userCompany.customRole.permissions.find((p) => p.module === module)
    
    // If module not found in permissions, deny all access
    if (!perm) {
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

    return {
      canAccess: true,
      canView: Boolean(perm.canView),
      canCreate: Boolean(perm.canCreate),
      canEdit: Boolean(perm.canEdit),
      canDelete: Boolean(perm.canDelete),
      canExport: Boolean(perm.canExport),
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

  // MANAGER has view/create/edit, no delete
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

  // USER (default) has view only
  return {
    canAccess: true,
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    restrictedByCustomRole: false,
  }
}
