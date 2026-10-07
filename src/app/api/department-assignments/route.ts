import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess, getAccessibleCompanies } from '@/lib/company-access'
import { isAdminRole } from '@/lib/purchase-permissions'

export const dynamic = 'force-dynamic'

async function resolveCompanyId(
  userId: string,
  queryCompanyId: string | null
): Promise<string | null> {
  if (queryCompanyId) return queryCompanyId
  const { companyIds } = await getAccessibleCompanies(userId)
  return companyIds[0] ?? null
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = await resolveCompanyId(decoded.userId, searchParams.get('companyId'))
    if (!companyId) return apiError('companyId requerido', 400)

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)

    const departmentId = searchParams.get('departmentId')
    const userId = searchParams.get('userId')

    const where: any = {
      department: { companyId },
      endedAt: null,
      user: { is: { isActive: true } },
    }
    if (departmentId) where.departmentId = departmentId
    if (userId) where.userId = userId

    const assignments = await prisma.userDepartment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    })

    return apiSuccess(assignments)
  } catch (error: any) {
    console.error('Error fetching department assignments:', error?.message)
    return apiError('Error al obtener asignaciones', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const {
      userId,
      departmentId,
      role,
      isApprover = false,
      isReceiver = false,
      isBuyer = false,
    } = body

    if (!userId || !departmentId) {
      return apiError('userId y departmentId son requeridos', 400)
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { companyId: true },
    })
    if (!department) return apiError('Departamento no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, department.companyId)
    if (!access.canAccess || !isAdminRole(access.effectiveRole)) {
      return apiError('Solo admins pueden crear asignaciones', 403)
    }

    const targetMembership = await prisma.userCompany.findFirst({
      where: { userId, companyId: department.companyId, endedAt: null, user: { is: { isActive: true } } },
    })
    if (!targetMembership) {
      return apiError('El usuario no pertenece a esta empresa', 400)
    }

    // Upsert: crear o actualizar si ya existe
    const existing = await prisma.userDepartment.findFirst({
      where: { userId, departmentId },
    })

    let result
    if (existing) {
      result = await prisma.userDepartment.update({
        where: { id: existing.id },
        data: { isApprover, isReceiver, isBuyer, role: role || existing.role, endedAt: null },
        include: {
          user: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
      })
    } else {
      result = await prisma.userDepartment.create({
        data: { userId, departmentId, role: role || null, isApprover, isReceiver, isBuyer },
        include: {
          user: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
      })
    }

    return apiSuccess(result, undefined, 201)
  } catch (error: any) {
    console.error('Error creating department assignment:', error?.message)
    return apiError('Error al crear asignación', 500)
  }
}
