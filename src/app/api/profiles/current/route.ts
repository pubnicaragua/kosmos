import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        userCompanies: {
          include: {
            company: true,
          },
        },
      },
    })

    if (!user) {
      return errorResponse('Usuario no encontrado', 404)
    }

    // Si el usuario es SUPER_ADMIN en alguna empresa, mostrar TODAS las empresas
    const isSuperAdmin = user.userCompanies.some(uc => uc.role === 'SUPER_ADMIN')
    
    let companies
    if (isSuperAdmin) {
      // SUPER_ADMIN ve todas las empresas
      const allCompanies = await prisma.company.findMany({
        orderBy: { name: 'asc' },
      })
      companies = allCompanies.map(company => {
        const userCompany = user.userCompanies.find(uc => uc.companyId === company.id)
        return {
          id: company.id,
          name: company.name,
          logo: company.logo,
          industry: company.industry,
          isActive: company.isActive,
          role: userCompany?.role || 'SUPER_ADMIN',
          quotePrimaryColor: company.quotePrimaryColor,
          quoteHeaderHtml: company.quoteHeaderHtml,
          quoteFooterHtml: company.quoteFooterHtml,
          quoteTerms: company.quoteTerms,
          invoicePrimaryColor: company.invoicePrimaryColor,
          invoiceHeaderHtml: company.invoiceHeaderHtml,
          invoiceFooterHtml: company.invoiceFooterHtml,
        }
      })
    } else {
      // Usuario normal solo ve sus empresas asignadas
      companies = user.userCompanies.map(uc => ({
        id: uc.company.id,
        name: uc.company.name,
        logo: uc.company.logo,
        industry: uc.company.industry,
        isActive: uc.company.isActive,
        role: uc.role,
        quotePrimaryColor: uc.company.quotePrimaryColor,
        quoteHeaderHtml: uc.company.quoteHeaderHtml,
        quoteFooterHtml: uc.company.quoteFooterHtml,
        quoteTerms: uc.company.quoteTerms,
        invoicePrimaryColor: uc.company.invoicePrimaryColor,
        invoiceHeaderHtml: uc.company.invoiceHeaderHtml,
        invoiceFooterHtml: uc.company.invoiceFooterHtml,
      }))
    }

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      companies,
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return errorResponse('Error al obtener el perfil', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const body = await request.json()
    const { name, avatar } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('El nombre es requerido', 400)
    }

    const updated = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        name: name.trim(),
        ...(avatar !== undefined ? { avatar } : {}),
      },
      select: { id: true, email: true, name: true, avatar: true },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Update profile error:', error)
    return errorResponse('Error al actualizar el perfil', 500)
  }
}
