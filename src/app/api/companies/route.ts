import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const decoded = verifyAccessToken(token)
    if (!decoded) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: decoded.userId },
      include: {
        company: true,
      },
    })

    const isSuperAdmin = userCompanies.some((uc) => uc.role === 'SUPER_ADMIN')

    if (isSuperAdmin) {
      const allCompanies = await prisma.company.findMany({
        orderBy: { name: 'asc' },
      })

      return successResponse(
        allCompanies.map((company) => {
          const userCompany = userCompanies.find((uc) => uc.companyId === company.id)
          return {
            id: company.id,
            name: company.name,
            logo: company.logo,
            industry: company.industry,
            isActive: company.isActive,
            role: userCompany?.role || 'SUPER_ADMIN',
            createdAt: company.createdAt,
            quotePrimaryColor: company.quotePrimaryColor as string,
            quoteHeaderHtml: company.quoteHeaderHtml as string,
            quoteFooterHtml: company.quoteFooterHtml as string,
            quoteTerms: company.quoteTerms as string,
            invoicePrimaryColor: company.invoicePrimaryColor as string,
            invoiceHeaderHtml: company.invoiceHeaderHtml as string,
            invoiceFooterHtml: company.invoiceFooterHtml as string,
          }
        })
      )
    }

    const companies = userCompanies.map(uc => ({
      id: uc.company.id,
      name: uc.company.name,
      logo: uc.company.logo,
      industry: uc.company.industry,
      isActive: uc.company.isActive,
      role: uc.role,
      createdAt: uc.company.createdAt,
      quotePrimaryColor: uc.company.quotePrimaryColor as string,
      quoteHeaderHtml: uc.company.quoteHeaderHtml as string,
      quoteFooterHtml: uc.company.quoteFooterHtml as string,
      quoteTerms: uc.company.quoteTerms as string,
      invoicePrimaryColor: uc.company.invoicePrimaryColor as string,
      invoiceHeaderHtml: uc.company.invoiceHeaderHtml as string,
      invoiceFooterHtml: uc.company.invoiceFooterHtml as string,
    }))

    return successResponse(companies)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return errorResponse('Error al obtener empresas', 500)
  }
}
