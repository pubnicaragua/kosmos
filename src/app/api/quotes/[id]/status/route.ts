import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'
import { stripLegacyQuoteDocumentStatus } from '@/lib/quote-public-view'

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

function mergeDiscountApprovalAudit(internalNotes: string | null | undefined, payload: unknown) {
  const currentNotes = (internalNotes || '').trim()
  const markerIndex = currentNotes.lastIndexOf(DISCOUNT_APPROVAL_MARKER)

  const cleanNotes = markerIndex === -1
    ? currentNotes
    : currentNotes.slice(0, markerIndex).trim()

  const auditBlock = `${DISCOUNT_APPROVAL_MARKER} ${JSON.stringify(payload)}`
  return cleanNotes ? `${cleanNotes}\n\n${auditBlock}` : auditBlock
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = await verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const approvalAction: string | undefined = body.approvalAction
    const comment = typeof body.comment === 'string' ? body.comment.trim() : ''

    if ('status' in body || 'legacyDocumentStatus' in body) {
      return apiError('El estado vigente se cambia mediante la etapa comercial', 400)
    }

    if (approvalAction && !['APPROVE_DISCOUNT', 'REJECT_DISCOUNT'].includes(approvalAction)) {
      return apiError('Acción de aprobación inválida', 400)
    }

    const quote = await prisma.quote.findUnique({ where: { id: params.id } })
    if (!quote) return apiError('Cotización no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, quote.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const effectiveRole = access.effectiveRole

    const isDiscountAction = approvalAction === 'APPROVE_DISCOUNT' || approvalAction === 'REJECT_DISCOUNT'

    if (isDiscountAction) {
      if (!effectiveRole || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(effectiveRole)) {
        return apiError('No tienes permisos para aprobar/rechazar descuentos', 403)
      }

      if (quote.discount <= 0) {
        return apiError('La cotización no tiene descuentos para aprobar/rechazar', 400)
      }
    }

    const discountDecision = approvalAction === 'APPROVE_DISCOUNT'
      ? 'APPROVED'
      : approvalAction === 'REJECT_DISCOUNT'
        ? 'REJECTED'
        : undefined

    if (!discountDecision) {
      return apiError('Debes enviar una acción de aprobación de descuento', 400)
    }

    const approvalPayload = isDiscountAction
      ? {
          status: discountDecision,
          approvedBy: decoded.userId,
          approvedRole: effectiveRole,
          approvedAt: new Date().toISOString(),
          comment: comment || null,
          discountAmount: quote.discount,
        }
      : null

    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: {
        internalNotes: approvalPayload
          ? mergeDiscountApprovalAudit(quote.internalNotes, approvalPayload)
          : quote.internalNotes,
      },
      include: {
        client: { select: { name: true } },
        items: true,
      },
    })

    return apiSuccess({
      ...stripLegacyQuoteDocumentStatus(updated),
      discountApproval: extractDiscountApproval(updated.internalNotes),
    })
  } catch (error) {
    console.error('Error updating quote discount approval:', error)
    return apiError('Error al actualizar aprobación de descuento', 500)
  }
}
