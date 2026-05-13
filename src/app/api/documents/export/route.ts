import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: decoded.userId },
      select: { companyId: true },
    })

    const companyIds = userCompanies.map((uc) => uc.companyId)

    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const documents = await prisma.document.findMany({
      where: {
        companyId: companyId || { in: companyIds },
      },
      include: {
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = documents.map((document) => ({
      Empresa: document.company.name,
      Nombre: document.name,
      Tipo: document.type,
      Concepto: document.concept,
      Categoria: document.category || '',
      URL: document.fileUrl,
      TamanoBytes: document.fileSize,
      FechaSubida: document.createdAt.toISOString().split('T')[0],
    }))

    return apiSuccess({
      data,
      filename: `documentos_${new Date().toISOString().split('T')[0]}.csv`,
    })
  } catch (error) {
    console.error('Error exporting documents:', error)
    return apiError('Error al exportar documentos', 500)
  }
}
