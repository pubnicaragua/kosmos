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
  })

  if (!userCompany) {
    return {
      canAccess: false,
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
    }
  }

  return {
    canAccess: true,
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
    effectiveRole: userCompany.role,
  }
}
