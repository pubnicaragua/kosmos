import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

const DISCOUNT_APPROVAL_MARKER = '[DISCOUNT_APPROVAL_AUDIT]'

function extractDiscountApproval(internalNotes?: string | null) {
  if (!internalNotes) return null

  const markerIndex = internalNotes.lastIndexOf(DISCOUNT_APPROVAL_MARKER)
  if (markerIndex === -1) return null

  const rawPayload = internalNotes
    .slice(markerIndex + DISCOUNT_APPROVAL_MARKER.length)
    .trim()

  if (!rawPayload) return null

  try {
    return JSON.parse(rawPayload)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        items: { include: { product: { select: { name: true } } } },
        company: { select: { name: true } },
      },
    })
    
    // Obtener datos del usuario creador (asesor)
    let createdByUser = null
    if (quote?.createdBy) {
      createdByUser = await prisma.user.findUnique({
        where: { id: quote.createdBy },
        select: { id: true, name: true, email: true },
      })
    }

    if (!quote) return apiError('Cotización no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, quote.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    return apiSuccess({
      ...quote,
      createdByUser,
      discountApproval: extractDiscountApproval(quote.internalNotes),
    })
  } catch (error) {
    console.error('Error fetching quote:', error)
    return apiError('Error al obtener cotización', 500)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const quote = await prisma.quote.findUnique({ where: { id: params.id } })
    if (!quote) return apiError('Cotización no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, quote.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    if ('status' in body || 'approvalAction' in body) {
      return apiError('Usa el endpoint de estado para aprobar/rechazar o cambiar estado', 400)
    }

    if ('companyId' in body || 'createdBy' in body) {
      return apiError('No se permite actualizar campos protegidos', 400)
    }

    if (typeof body.clientId === 'string' && body.clientId !== quote.clientId) {
      const targetClient = await prisma.client.findUnique({ where: { id: body.clientId } })
      if (!targetClient || targetClient.companyId !== quote.companyId) {
        return apiError('El cliente no pertenece a la misma empresa de la cotización', 400)
      }
    }

    const updateData: Record<string, unknown> = {
      clientId: typeof body.clientId === 'string' ? body.clientId : undefined,
      currency: typeof body.currency === 'string' ? body.currency : undefined,
      subtotal: typeof body.subtotal === 'number' ? body.subtotal : undefined,
      discount: typeof body.discount === 'number' ? body.discount : undefined,
      tax: typeof body.tax === 'number' ? body.tax : undefined,
      total: typeof body.total === 'number' ? body.total : undefined,
      paymentMethod: ['CONTADO', 'CREDITO'].includes(body.paymentMethod) ? body.paymentMethod : undefined,
      taxApplies: typeof body.taxApplies === 'boolean' ? body.taxApplies : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      notes: typeof body.notes === 'string' || body.notes === null ? body.notes : undefined,
      terms: typeof body.terms === 'string' || body.terms === null ? body.terms : undefined,
    }

    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: { select: { name: true } },
        items: true,
      },
    })

    return apiSuccess({
      ...updated,
      discountApproval: extractDiscountApproval(updated.internalNotes),
    })
  } catch (error) {
    console.error('Error updating quote:', error)
    return apiError('Error al actualizar cotización', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const quote = await prisma.quote.findUnique({ where: { id: params.id } })
    if (!quote) return apiError('Cotización no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, quote.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.quote.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Cotización eliminada' })
  } catch (error) {
    console.error('Error deleting quote:', error)
    return apiError('Error al eliminar cotización', 500)
  }
}
