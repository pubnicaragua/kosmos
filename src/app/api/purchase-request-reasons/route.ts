import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess, getModuleAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

// GET - List reasons by company and optional requestType filter
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const requestType = searchParams.get('requestType')

    if (!companyId) {
      return apiError('companyId requerido', 400)
    }

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = { companyId, isActive: true }
    if (requestType) {
      where.requestType = requestType
    }

    const reasons = await prisma.purchaseRequestReason.findMany({
      where,
      orderBy: { name: 'asc' }
    })

    return apiSuccess(reasons)
  } catch (error) {
    console.error('Error fetching purchase request reasons:', error)
    return apiError('Error al obtener motivos', 500)
  }
}

// POST - Create new reason
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { companyId, requestType, name, description } = body

    if (!companyId || !requestType || !name) {
      return apiError('companyId, requestType y name son requeridos', 400)
    }

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const moduleAccess = await getModuleAccess(decoded.userId, companyId, 'solicitudes-compra')
    if (!moduleAccess.canCreate && access.effectiveRole !== 'SUPER_ADMIN' && access.effectiveRole !== 'ADMIN') {
      return apiError('No tienes permisos para crear motivos', 403)
    }

    // Check if reason already exists
    const existing = await prisma.purchaseRequestReason.findFirst({
      where: { companyId, requestType, name: name.trim() }
    })

    if (existing) {
      return apiError('Ya existe un motivo con ese nombre para este tipo de solicitud', 400)
    }

    const reason = await prisma.purchaseRequestReason.create({
      data: {
        companyId,
        requestType,
        name: name.trim(),
        description: description?.trim() || null
      }
    })

    return apiSuccess(reason, 'Motivo creado exitosamente', 201)
  } catch (error) {
    console.error('Error creating purchase request reason:', error)
    return apiError('Error al crear motivo', 500)
  }
}

// PUT - Update reason
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { id, name, description, isActive } = body

    if (!id) {
      return apiError('id es requerido', 400)
    }

    const existing = await prisma.purchaseRequestReason.findUnique({
      where: { id }
    })

    if (!existing) {
      return apiError('Motivo no encontrado', 404)
    }

    const access = await getCompanyAccess(decoded.userId, existing.companyId)
    if (!access.canAccess) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const moduleAccess = await getModuleAccess(decoded.userId, existing.companyId, 'solicitudes-compra')
    if (!moduleAccess.canEdit && access.effectiveRole !== 'SUPER_ADMIN' && access.effectiveRole !== 'ADMIN') {
      return apiError('No tienes permisos para editar motivos', 403)
    }

    const reason = await prisma.purchaseRequestReason.update({
      where: { id },
      data: {
        name: name?.trim() || existing.name,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive
      }
    })

    return apiSuccess(reason, 'Motivo actualizado exitosamente')
  } catch (error) {
    console.error('Error updating purchase request reason:', error)
    return apiError('Error al actualizar motivo', 500)
  }
}

// DELETE - Delete reason (soft delete by setting isActive = false)
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { id } = body

    if (!id) {
      return apiError('id es requerido', 400)
    }

    const existing = await prisma.purchaseRequestReason.findUnique({
      where: { id }
    })

    if (!existing) {
      return apiError('Motivo no encontrado', 404)
    }

    const access = await getCompanyAccess(decoded.userId, existing.companyId)
    if (!access.canAccess) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const moduleAccess = await getModuleAccess(decoded.userId, existing.companyId, 'solicitudes-compra')
    if (!moduleAccess.canDelete && access.effectiveRole !== 'SUPER_ADMIN' && access.effectiveRole !== 'ADMIN') {
      return apiError('No tienes permisos para eliminar motivos', 403)
    }

    // Soft delete
    await prisma.purchaseRequestReason.update({
      where: { id },
      data: { isActive: false }
    })

    return apiSuccess(null, 'Motivo eliminado exitosamente')
  } catch (error) {
    console.error('Error deleting purchase request reason:', error)
    return apiError('Error al eliminar motivo', 500)
  }
}
