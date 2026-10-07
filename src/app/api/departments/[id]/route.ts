import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const department = await prisma.department.findUnique({
      where: { id: params.id },
      include: {
        userDepartments: { where: { endedAt: null, user: { is: { isActive: true } } } },
        _count: {
          select: {
            userDepartments: { where: { endedAt: null, user: { is: { isActive: true } } } },
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

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { name, description, isActive, userAssignments } = body

    const existing = await prisma.department.findUnique({
      where: { id: params.id },
    })

    if (!existing) return apiError('Departamento no encontrado', 404)

    const access = await getCompanyAccess(decoded.userId, existing.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    if (userAssignments !== undefined && !Array.isArray(userAssignments)) {
      return apiError('userAssignments debe ser una lista', 400)
    }

    const assignments = userAssignments as Array<{
      userId: string
      role?: string | null
      isApprover?: boolean
      isReceiver?: boolean
      isBuyer?: boolean
    }> | undefined
    const assignmentUserIds = assignments?.map((assignment) => assignment.userId)
    if (assignmentUserIds?.some((userId) => typeof userId !== 'string' || !userId) ||
        (assignmentUserIds && new Set(assignmentUserIds).size !== assignmentUserIds.length)) {
      return apiError('Las asignaciones contienen usuarios inválidos o repetidos', 400)
    }

    const department = await prisma.$transaction(async (tx) => {
      await tx.department.update({
        where: { id: params.id },
        data: {
          name: name || existing.name,
          description: description !== undefined ? description : existing.description,
          isActive: isActive !== undefined ? isActive : existing.isActive,
        },
      })

      if (assignments) {
        if (assignmentUserIds!.length > 0) {
          const activeMemberships = await tx.userCompany.findMany({
            where: {
              companyId: existing.companyId,
              userId: { in: assignmentUserIds },
              endedAt: null,
              user: { is: { isActive: true } },
            },
            select: { userId: true },
          })
          if (activeMemberships.length !== assignmentUserIds!.length) {
            throw new Error('ASSIGNMENT_USER_NOT_IN_COMPANY')
          }
        }

        const deactivatedAt = new Date()
        if (assignmentUserIds!.length === 0) {
          await tx.userDepartment.updateMany({
            where: { departmentId: params.id, endedAt: null },
            data: { endedAt: deactivatedAt },
          })
        } else {
          await tx.userDepartment.updateMany({
            where: {
              departmentId: params.id,
              endedAt: null,
              userId: { notIn: assignmentUserIds },
            },
            data: { endedAt: deactivatedAt },
          })
        }

        for (const assignment of assignments) {
          const existingAssignment = await tx.userDepartment.findUnique({
            where: {
              userId_departmentId: { userId: assignment.userId, departmentId: params.id },
            },
            select: { id: true },
          })
          const assignmentData = {
            role: assignment.role || null,
            isApprover: Boolean(assignment.isApprover),
            isReceiver: Boolean(assignment.isReceiver),
            isBuyer: Boolean(assignment.isBuyer),
            endedAt: null,
          }

          if (existingAssignment) {
            await tx.userDepartment.update({ where: { id: existingAssignment.id }, data: assignmentData })
          } else {
            await tx.userDepartment.create({
              data: { ...assignmentData, userId: assignment.userId, departmentId: params.id },
            })
          }
        }
      }

      return tx.department.findUnique({
        where: { id: params.id },
        include: {
          userDepartments: { where: { endedAt: null, user: { is: { isActive: true } } } },
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return apiSuccess(department)
  } catch (error: any) {
    if (error?.message === 'ASSIGNMENT_USER_NOT_IN_COMPANY') {
      return apiError('Cada usuario asignado debe pertenecer activamente a esta empresa', 400)
    }
    console.error('Error updating department:', error)
    return apiError(`Error al actualizar departamento: ${error.message || 'Desconocido'}`, 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
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
