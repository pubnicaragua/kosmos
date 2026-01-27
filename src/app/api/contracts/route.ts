import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: decoded.userId },
      select: { companyId: true },
    })

    const companyIds = userCompanies.map((uc: any) => uc.companyId)
    const where: any = { companyId: companyId || { in: companyIds } }
    if (status) where.status = status

    const contracts = await prisma.contract.findMany({
      where,
      include: { company: { select: { name: true } } },
      orderBy: { endDate: 'asc' },
    })

    return apiSuccess(contracts.map((contract: any) => ({
      id: contract.id,
      company: contract.company.name,
      contractId: contract.contractId,
      name: contract.name,
      concept: contract.concept,
      category: contract.category,
      party: contract.party,
      startDate: contract.startDate.toISOString(),
      endDate: contract.endDate.toISOString(),
      status: contract.status,
      fileUrl: contract.fileUrl,
      uploadedBy: contract.uploadedBy,
    })))
  } catch (error) {
    console.error('Error fetching contracts:', error)
    return apiError('Error al obtener contratos', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { companyId, ...contractData } = body

    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId },
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const contract = await prisma.contract.create({
      data: {
        ...contractData,
        companyId,
        startDate: new Date(contractData.startDate),
        endDate: new Date(contractData.endDate),
        uploadedBy: decoded.userId,
      },
    })

    return apiSuccess(contract, undefined, 201)
  } catch (error) {
    console.error('Error creating contract:', error)
    return apiError('Error al crear contrato', 500)
  }
}
