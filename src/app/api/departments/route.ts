import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) return apiError('companyId requerido', 400)

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const departments = await prisma.department.findMany({
      where: { companyId },
      include: {
        userDepartments: {
          select: {
            userId: true,
            role: true,
            isApprover: true,
          },
        },
        _count: {
          select: {
            userDepartments: true,
            purchaseRequests: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return apiSuccess(departments)
  } catch (error) {
    console.error('Error fetching departments:', error)
    return apiError('Error al obtener departamentos', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { companyId, name, description, userAssignments } = body

    if (!companyId || !name) {
      return apiError('companyId y name son requeridos', 400)
    }

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const department = await prisma.department.create({
      data: {
        companyId,
        name,
        description: description || null,
        userDepartments: userAssignments?.length
          ? {
              create: userAssignments.map((ua: any) => ({
                userId: ua.userId,
                role: ua.role || null,
                isApprover: ua.isApprover || false,
              })),
            }
          : undefined,
      },
      include: {
        userDepartments: true,
      },
    })

    return apiSuccess(department, undefined, 201)
  } catch (error: any) {
    console.error('Error creating department:', error)
    return apiError('Error al crear departamento', 500)
  }
}
