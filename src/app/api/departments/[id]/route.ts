import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const department = await prisma.department.findUnique({
      where: { id: params.id },
      include: {
        userDepartments: true,
        _count: {
          select: {
            userDepartments: true,
            purchaseRequests: true,
          },
        },
      },
    })

    if (!department) return apiError('Departamento no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, department.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    return apiSuccess(department)
  } catch (error) {
    console.error('Error fetching department:', error)
    return apiError('Error al obtener departamento', 500)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { name, description, isActive, userAssignments } = body

    const existing = await prisma.department.findUnique({
      where: { id: params.id },
    })

    if (!existing) return apiError('Departamento no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, existing.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const department = await prisma.department.update({
      where: { id: params.id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
      include: {
        userDepartments: true,
      },
    })

    if (userAssignments) {
      await prisma.userDepartment.deleteMany({
        where: { departmentId: params.id },
      })

      if (userAssignments.length > 0) {
        await prisma.userDepartment.createMany({
          data: userAssignments.map((ua: any) => ({
            departmentId: params.id,
            userId: ua.userId,
            role: ua.role || null,
            isApprover: ua.isApprover || false,
          })),
        })
      }
    }

    return apiSuccess(department)
  } catch (error) {
    console.error('Error updating department:', error)
    return apiError('Error al actualizar departamento', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const existing = await prisma.department.findUnique({
      where: { id: params.id },
    })

    if (!existing) return apiError('Departamento no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, existing.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.department.delete({
      where: { id: params.id },
    })

    return apiSuccess({ message: 'Departamento eliminado exitosamente' })
  } catch (error) {
    console.error('Error deleting department:', error)
    return apiError('Error al eliminar departamento', 500)
  }
}
