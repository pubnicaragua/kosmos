import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { changeUserNameInTransaction } from '@/lib/user-name-history'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = await verifyAccessToken(token)
    
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        userCompanies: {
          where: { endedAt: null },
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
          exchangeRate: company.exchangeRate,
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
        exchangeRate: uc.company.exchangeRate,
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
    const payload = await verifyAccessToken(token)
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const body = await request.json()
    const { name, avatar } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('El nombre es requerido', 400)
    }

    const updated = await prisma.$transaction(async (tx) => {
      await changeUserNameInTransaction(tx, {
        userId: payload.userId,
        name,
        changedById: payload.userId,
      })

      return tx.user.update({
        where: { id: payload.userId },
        data: avatar !== undefined ? { avatar } : {},
        select: { id: true, email: true, name: true, avatar: true },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return successResponse(updated)
  } catch (error) {
    console.error('Update profile error:', error)
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return errorResponse('Usuario no encontrado', 404)
    }
    if (error instanceof Error && error.message === 'USER_INACTIVE') {
      return errorResponse('La cuenta está desactivada', 401)
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return errorResponse('Cambio simultáneo detectado; vuelve a intentar', 409)
    }
    return errorResponse('Error al actualizar el perfil', 500)
  }
}
