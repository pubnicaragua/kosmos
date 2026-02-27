import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const type = searchParams.get('type')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = { companyId: companyId || { in: companyIds } }
    if (type) where.type = type

    const documents = await prisma.document.findMany({
      where,
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(documents)
  } catch (error: any) {
    console.error('Error fetching documents:', error?.message, error?.code)
    return apiError(`Error al obtener documentos: ${error?.message || 'Error desconocido'}`, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { companyId, ...docData } = body

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const { area, visibility, category, ...cleanDocData } = docData as any
    const document = await prisma.document.create({
      data: {
        ...cleanDocData,
        companyId,
        uploadedBy: decoded.userId,
        area: area || 'General',
        visibility: visibility || 'COMPARTIDO',
        category: category || 'General',
      },
    })

    return apiSuccess(document, undefined, 201)
  } catch (error: any) {
    console.error('Error creating document:', error?.message, error?.code, JSON.stringify(error))
    return apiError(`Error al crear documento: ${error?.message || 'Error desconocido'}`, 500)
  }
}
