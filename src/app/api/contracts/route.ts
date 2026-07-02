import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getAccessibleCompanies, getCompanyAccess, getModuleAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

function getContractStatus(endDate: Date): 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' {
  const today = new Date()
  const end = new Date(endDate)

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endStart = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  if (endStart < todayStart) return 'EXPIRED'

  const diffTime = endStart.getTime() - todayStart.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 30 ? 'EXPIRING_SOON' : 'ACTIVE'
}

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
    const allowedCompanyIds = []

    for (const cid of companyIds) {
      const moduleAccess = await getModuleAccess(decoded.userId, cid, 'contratos')
      if (moduleAccess.canView) {
        allowedCompanyIds.push(cid)
      }
    }

    const where: any = {}

    if (companyId) {
      if (!allowedCompanyIds.includes(companyId)) {
        return apiError('No tienes permisos para ver contratos en esta empresa', 403)
      }
      where.companyId = companyId
    } else {
      if (allowedCompanyIds.length === 0) {
        return apiError('No tienes permisos para ver contratos en ninguna empresa', 403)
      }
      where.companyId = { in: allowedCompanyIds }
    }
    if (status) where.status = status
    
    // Búsqueda general por nombre, parte o concepto
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { party: { contains: search, mode: 'insensitive' } },
        { concept: { contains: search, mode: 'insensitive' } },
      ]
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: { company: { select: { name: true } } },
      orderBy: { endDate: 'asc' },
    })

    return apiSuccess(contracts)
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

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const moduleAccess = await getModuleAccess(decoded.userId, companyId, 'contratos')
    if (!moduleAccess.canCreate) return apiError('No tienes permisos para crear contratos', 403)

    const year = new Date().getFullYear()
    const countResult = await prisma.contract.count({ where: { companyId } })
    const contractNumber = String(countResult + 1).padStart(3, '0')
    const contractId = `CTR-${year}-${contractNumber}`
    const endDateValue = contractData.endDate ? new Date(contractData.endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    const startDateValue = contractData.startDate ? new Date(contractData.startDate) : new Date()

    const contract = await prisma.contract.create({
      data: {
        ...contractData,
        contractId,
        concept: contractData.concept || 'Contrato de servicio',
        party: contractData.party || 'Cliente',
        startDate: startDateValue,
        endDate: endDateValue,
        status: getContractStatus(endDateValue),
        uploadedBy: decoded.userId,
        companyId,
      },
    })

    return apiSuccess(contract, undefined, 201)
  } catch (error: any) {
    console.error('Error creating contract:', error)
    if (error?.name === 'ZodError') {
      const issues = error.issues?.map((i: any) => i.message).join(', ')
      return apiError(`Datos inválidos: ${issues}`, 400)
    }
    return apiError(`Error al crear contrato: ${error?.message || error}`, 500)
  }
}
