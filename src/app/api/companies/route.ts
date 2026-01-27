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

    const companies = userCompanies.map(uc => ({
      id: uc.company.id,
      name: uc.company.name,
      logo: uc.company.logo,
      industry: uc.company.industry,
      isActive: uc.company.isActive,
      role: uc.role,
      createdAt: uc.company.createdAt,
    }))

    return successResponse(companies)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return errorResponse('Error al obtener empresas', 500)
  }
}
