import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Token requerido', 401)
    }

    const payload = await verifyAccessToken(authHeader.substring(7))
    if (!payload) return errorResponse('Token inválido', 401)

    const access = await getCompanyAccess(payload.userId, params.id)
    if (!access.canAccess) return errorResponse('Sin acceso a esta empresa', 403)

    const company = await prisma.company.findUnique({ 
      where: { id: params.id },
      select: { ticketStages: true }
    })
    
    if (!company) return errorResponse('Empresa no encontrada', 404)

    return successResponse(company.ticketStages || [])
  } catch (error) {
    console.error('Get ticket stages error:', error)
    return errorResponse('Error al obtener etapas de tickets', 500)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Token requerido', 401)
    }

    const payload = await verifyAccessToken(authHeader.substring(7))
    if (!payload) return errorResponse('Token inválido', 401)

    const access = await getCompanyAccess(payload.userId, params.id)
    if (!access.canAccess) return errorResponse('Sin acceso a esta empresa', 403)

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN']
    if (!allowedRoles.includes(access.effectiveRole || '')) {
      return errorResponse('No tienes permisos para editar esta empresa', 403)
    }

    const body = await request.json()
    const { stages } = body

    if (!Array.isArray(stages)) {
      return errorResponse('Las etapas deben ser una lista (array)', 400)
    }

    const updated = await prisma.company.update({
      where: { id: params.id },
      data: {
        ticketStages: stages
      },
      select: { ticketStages: true }
    })

    return successResponse(updated.ticketStages)
  } catch (error) {
    console.error('Update ticket stages error:', error)
    return errorResponse('Error al actualizar etapas de tickets', 500)
  }
}
