import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { purchaseRequestSchema } from '@/lib/validations'
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
    const priority = searchParams.get('priority')
    const requestType = searchParams.get('requestType')
    const search = searchParams.get('search')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = {
      companyId: companyId || { in: companyIds }
    }

    if (status) where.status = status
    if (priority) where.priority = priority
    if (requestType) where.requestType = requestType
    
    if (search) {
      where.OR = [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { requestingArea: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    const purchaseRequests = await prisma.purchaseRequest.findMany({
      where,
      include: {
        company: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(purchaseRequests)
  } catch (error) {
    console.error('Error fetching purchase requests:', error)
    return apiError('Error al obtener solicitudes de compra', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const parsed = purchaseRequestSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Datos inválidos', 400)
    }
    const validatedData = parsed.data

    const access = await getCompanyAccess(decoded.userId, validatedData.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    // Generar número de solicitud único
    const lastRequest = await prisma.purchaseRequest.findFirst({
      where: { companyId: validatedData.companyId },
      orderBy: { createdAt: 'desc' },
      select: { requestNumber: true }
    })
    
    let requestNumber = 'SC-000001'
    if (lastRequest?.requestNumber) {
      const lastNumber = parseInt(lastRequest.requestNumber.split('-')[1] || '0')
      requestNumber = `SC-${String(lastNumber + 1).padStart(6, '0')}`
    }

    // Calcular totales de los items
    const itemsWithTotals = validatedData.items.map(item => ({
      ...item,
      totalCost: item.unitCost && item.requestedQuantity 
        ? item.unitCost * item.requestedQuantity 
        : item.totalCost || 0
    }))

    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        requestNumber,
        companyId: validatedData.companyId,
        requestingArea: validatedData.requestingArea,
        requestedBy: validatedData.requestedBy,
        requestType: validatedData.requestType,
        priority: validatedData.priority,
        status: validatedData.status,
        notes: validatedData.notes,
        items: {
          create: itemsWithTotals.map(item => ({
            productId: item.productId,
            sku: item.sku,
            productName: item.productName,
            category: item.category,
            currentStock: item.currentStock,
            minimumStock: item.minimumStock,
            requestedQuantity: item.requestedQuantity,
            reason: item.reason,
            lastSaleDate: item.lastSaleDate ? new Date(item.lastSaleDate) : null,
            monthlyAverage: item.monthlyAverage,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
          }))
        }
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } }
          }
        }
      }
    })

    return apiSuccess(purchaseRequest, undefined, 201)
  } catch (error: any) {
    console.error('Error creating purchase request:', error)
    return apiError('Error al crear solicitud de compra', 500)
  }
}
