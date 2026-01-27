import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { selectCompanySchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('UNAUTHORIZED', 'Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    
    if (!payload) {
      return errorResponse('UNAUTHORIZED', 'Token inválido o expirado', 401)
    }

    const body = await request.json()
    const validation = selectCompanySchema.safeParse(body)
    
    if (!validation.success) {
      return errorResponse('VALIDATION_ERROR', validation.error.errors[0].message, 400)
    }

    const { companyId } = validation.data

    const userCompany = await prisma.userCompany.findFirst({
      where: {
        userId: payload.userId,
        companyId,
      },
      include: {
        company: true,
      },
    })

    if (!userCompany) {
      return errorResponse('FORBIDDEN', 'No tienes acceso a esta empresa', 403)
    }

    return successResponse({
      company: {
        id: userCompany.company.id,
        name: userCompany.company.name,
        logo: userCompany.company.logo,
        industry: userCompany.company.industry,
        isActive: userCompany.company.isActive,
      },
      role: userCompany.role,
    })
  } catch (error) {
    console.error('Select company error:', error)
    return errorResponse('SERVER_ERROR', 'Error al seleccionar la empresa', 500)
  }
}
