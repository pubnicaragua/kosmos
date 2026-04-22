import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const employee = await prisma.employee.findUnique({
      where: { id: params.id }
    })

    if (!employee) return apiError('Empleado no encontrado', 404)

    // Verify user has access to company
    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: employee.companyId }
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    return apiSuccess(employee)
  } catch (error) {
    console.error('Error fetching employee:', error)
    return apiError('Error al obtener empleado', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const employee = await prisma.employee.findUnique({
      where: { id: params.id }
    })

    if (!employee) return apiError('Empleado no encontrado', 404)

    // Verify user has access to company
    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: employee.companyId }
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const body = await request.json()

    // Remove fields that shouldn't be updated
    const { id, companyId, createdAt, ...updateData } = body

    // Handle date fields
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate)
    }
    if (updateData.birthDate) {
      updateData.birthDate = new Date(updateData.birthDate)
    }

    const updated = await prisma.employee.update({
      where: { id: params.id },
      data: updateData
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating employee:', error)
    return apiError('Error al actualizar empleado', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const employee = await prisma.employee.findUnique({
      where: { id: params.id }
    })

    if (!employee) return apiError('Empleado no encontrado', 404)

    // Verify user has access to company
    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: employee.companyId }
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.employee.delete({
      where: { id: params.id }
    })

    return apiSuccess({ message: 'Empleado eliminado' })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return apiError('Error al eliminar empleado', 500)
  }
}
