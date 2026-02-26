import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) return apiError('companyId es requerido', 400)

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    let columns = await prisma.pipelineColumn.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
    })

    if (columns.length === 0) {
      const defaultColumns = [
        { name: 'Prospecto', color: '#ef4444', order: 1 },
        { name: 'Contactado', color: '#3b82f6', order: 2 },
        { name: 'Propuesta', color: '#f59e0b', order: 3 },
        { name: 'Negociación', color: '#8b5cf6', order: 4 },
        { name: 'Cerrado', color: '#10b981', order: 5 },
      ]

      columns = await Promise.all(
        defaultColumns.map((col) =>
          prisma.pipelineColumn.create({
            data: {
              companyId,
              name: col.name,
              color: col.color,
              order: col.order,
            },
          })
        )
      )
    }

    return apiSuccess(columns)
  } catch (error) {
    console.error('Error fetching pipeline columns:', error)
    return apiError('Error al obtener columnas', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { companyId, name, color, order } = body

    if (!companyId || !name) {
      return apiError('companyId y name son requeridos', 400)
    }

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess || !['SUPER_ADMIN', 'ADMIN'].includes(access.effectiveRole || '')) {
      return apiError('Solo administradores pueden crear columnas', 403)
    }

    const column = await prisma.pipelineColumn.create({
      data: {
        companyId,
        name,
        color: color || '#6366f1',
        order: order || 999,
      },
    })

    return apiSuccess(column, undefined, 201)
  } catch (error) {
    console.error('Error creating pipeline column:', error)
    return apiError('Error al crear columna', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { columns } = body

    if (!Array.isArray(columns)) {
      return apiError('columns debe ser un array', 400)
    }

    if (columns.length === 0) {
      return apiError('columns no puede estar vacío', 400)
    }

    const firstColumn = await prisma.pipelineColumn.findUnique({
      where: { id: columns[0].id },
    })

    if (!firstColumn) return apiError('Columna no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, firstColumn.companyId)
    if (!access.canAccess || !['SUPER_ADMIN', 'ADMIN'].includes(access.effectiveRole || '')) {
      return apiError('Solo administradores pueden actualizar columnas', 403)
    }

    const updated = await Promise.all(
      columns.map((col: any) =>
        prisma.pipelineColumn.update({
          where: { id: col.id },
          data: {
            name: col.name,
            color: col.color,
            order: col.order,
          },
        })
      )
    )

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating pipeline columns:', error)
    return apiError('Error al actualizar columnas', 500)
  }
}
