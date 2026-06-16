import { prisma } from '@/lib/prisma'
import { getCompanyAccess } from '@/lib/company-access'

export const isAdminRole = (role?: string | null): boolean =>
  role === 'SUPER_ADMIN' || role === 'ADMIN'

export interface PurchasePermissions {
  canApprove: boolean
  canReceive: boolean
  canBuy: boolean
  isAdmin: boolean
  departmentAssignment: {
    isApprover: boolean
    isReceiver: boolean
    isBuyer: boolean
    role: string | null
  } | null
}

/**
 * Devuelve los permisos de un usuario sobre las acciones de una solicitud de compra.
 * Admin/SUPER_ADMIN tienen todos los permisos. En otro caso, se evalúan los flags
 * del UserDepartment a nivel de empresa completa (cualquier departamento).
 *
 * Si el usuario tiene isApprover=true en cualquier departamento de la empresa,
 * puede aprobar solicitudes sin importar el departamento de la solicitud.
 */
export async function getPurchasePermissions(
  userId: string,
  companyId: string,
  departmentId: string | null | undefined
): Promise<PurchasePermissions> {
  const access = await getCompanyAccess(userId, companyId)
  const isAdmin = isAdminRole(access.effectiveRole)

  // Buscar en TODOS los departamentos de la empresa para obtener permisos combinados
  const assignments = await prisma.userDepartment.findMany({
    where: {
      userId,
      department: { companyId },
    },
    select: { isApprover: true, isReceiver: true, isBuyer: true, role: true },
  })

  const canApprove = isAdmin || assignments.some((a) => a.isApprover)
  const canReceive = isAdmin || assignments.some((a) => a.isReceiver)
  const canBuy = isAdmin || assignments.some((a) => a.isBuyer)

  const primaryAssignment =
    assignments.find((a) => a.isApprover || a.isReceiver || a.isBuyer) ??
    assignments[0] ??
    null

  return {
    canApprove,
    canReceive,
    canBuy,
    isAdmin,
    departmentAssignment: primaryAssignment
      ? {
          isApprover: assignments.some((a) => a.isApprover),
          isReceiver: assignments.some((a) => a.isReceiver),
          isBuyer: assignments.some((a) => a.isBuyer),
          role: primaryAssignment.role,
        }
      : null,
  }
}
