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

    const company = await prisma.company.findUnique({ where: { id: params.id } })
    if (!company) return errorResponse('Empresa no encontrada', 404)

    return successResponse(company)
  } catch (error) {
    console.error('Get company error:', error)
    return errorResponse('Error al obtener empresa', 500)
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
    const { 
      name, industry, logo, isActive,
      quotePrimaryColor, quoteHeaderHtml, quoteFooterHtml, quoteTerms,
      invoicePrimaryColor, invoiceHeaderHtml, invoiceFooterHtml, exchangeRate
    } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('El nombre de la empresa es requerido', 400)
    }

    const updated = await prisma.company.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        ...(industry !== undefined ? { industry } : {}),
        ...(logo !== undefined ? { logo } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(quotePrimaryColor !== undefined ? { quotePrimaryColor } : {}),
        ...(quoteHeaderHtml !== undefined ? { quoteHeaderHtml } : {}),
        ...(quoteFooterHtml !== undefined ? { quoteFooterHtml } : {}),
        ...(quoteTerms !== undefined ? { quoteTerms } : {}),
        ...(invoicePrimaryColor !== undefined ? { invoicePrimaryColor } : {}),
        ...(invoiceHeaderHtml !== undefined ? { invoiceHeaderHtml } : {}),
        ...(invoiceFooterHtml !== undefined ? { invoiceFooterHtml } : {}),
        ...(exchangeRate !== undefined ? { exchangeRate } : {}),
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Update company error:', error)
    return errorResponse('Error al actualizar empresa', 500)
  }
}
