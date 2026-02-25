import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { clientSchema } from '@/lib/validations'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)

    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = {}
    where.companyId = companyId ? companyId : { in: companyIds }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { phone2: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(clients)
  } catch (error: any) {
    console.error('Error fetching clients:', error?.message || error)
    console.error('Error stack:', error?.stack)
    console.error('Prisma error code:', error?.code)
    return apiError(`Error al obtener clientes: ${error?.message || 'unknown'}`, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const validatedData = clientSchema.parse(body)

    const access = await getCompanyAccess(decoded.userId, validatedData.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const client = await prisma.client.create({
      data: validatedData,
      include: {
        company: { select: { name: true } },
      },
    })

    return apiSuccess(client, undefined, 201)
  } catch (error) {
    console.error('Error creating client:', error)
    return apiError('Error al crear cliente', 500)
  }
}
