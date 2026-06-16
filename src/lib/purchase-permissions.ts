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
 * del UserDepartment del departamento concreto de la solicitud.
 *
 * Los flags son combinables: un usuario puede ser aprobador + receptor + comprador
 * a la vez en el mismo departamento, o tenerlos en departamentos distintos.
 */
export async function getPurchasePermissions(
  userId: string,
  companyId: string,
  departmentId: string | null | undefined
): Promise<PurchasePermissions> {
  const access = await getCompanyAccess(userId, companyId)
  const isAdmin = isAdminRole(access.effectiveRole)

  const assignment = departmentId
    ? await prisma.userDepartment.findFirst({
        where: { userId, departmentId },
        select: { isApprover: true, isReceiver: true, isBuyer: true, role: true },
      })
    : null

  return {
    canApprove: isAdmin || Boolean(assignment?.isApprover),
    canReceive: isAdmin || Boolean(assignment?.isReceiver),
    canBuy: isAdmin || Boolean(assignment?.isBuyer),
    isAdmin,
    departmentAssignment: assignment
      ? {
          isApprover: assignment.isApprover,
          isReceiver: assignment.isReceiver,
          isBuyer: assignment.isBuyer,
          role: assignment.role,
        }
      : null,
  }
}
