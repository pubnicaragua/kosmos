import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true, stock: true, minStock: true } }
          }
        }
      },
    })

    if (!purchaseRequest) return apiError('Solicitud no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, purchaseRequest.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    return apiSuccess(purchaseRequest)
  } catch (error) {
    console.error('Error fetching purchase request:', error)
    return apiError('Error al obtener solicitud', 500)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const purchaseRequest = await prisma.purchaseRequest.findUnique({ 
      where: { id: params.id },
      include: { items: true }
    })
    if (!purchaseRequest) return apiError('Solicitud no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, purchaseRequest.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const updateData: any = {
      requestingArea: body.requestingArea,
      requestType: body.requestType,
      priority: body.priority,
      status: body.status,
      notes: body.notes,
    }

    // Actualizar fechas según el estado
    if (body.status === 'APROBADA' && purchaseRequest.status !== 'APROBADA') {
      updateData.approvedBy = decoded.userId
      updateData.approvedAt = new Date()
    }

    if (body.status === 'RECHAZADA') {
      updateData.rejectedReason = body.rejectedReason
    }

    if (body.status === 'COMPRADO' && purchaseRequest.status !== 'COMPRADO') {
      updateData.purchasedAt = new Date()
    }

    if (body.status === 'RECIBIDO' && purchaseRequest.status !== 'RECIBIDO') {
      updateData.receivedAt = new Date()
      
      // Actualizar inventario automáticamente cuando se recibe
      if (body.updateInventory && body.items) {
        for (const item of body.items) {
          if (item.productId) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: item.requestedQuantity
                }
              }
            })
          }
        }
      }
    }

    // Actualizar items si se proporcionan
    if (body.items) {
      // Eliminar items existentes
      await prisma.purchaseRequestItem.deleteMany({
        where: { purchaseRequestId: params.id }
      })

      // Crear nuevos items
      updateData.items = {
        create: body.items.map((item: any) => ({
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
          totalCost: item.unitCost && item.requestedQuantity 
            ? item.unitCost * item.requestedQuantity 
            : item.totalCost || 0,
        }))
      }
    }

    const updated = await prisma.purchaseRequest.update({
      where: { id: params.id },
      data: updateData,
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } }
          }
        }
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating purchase request:', error)
    return apiError('Error al actualizar solicitud', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const purchaseRequest = await prisma.purchaseRequest.findUnique({ where: { id: params.id } })
    if (!purchaseRequest) return apiError('Solicitud no encontrada', 404)

    const access = await getCompanyAccess(decoded.userId, purchaseRequest.companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    await prisma.purchaseRequest.delete({ where: { id: params.id } })
    return apiSuccess({ message: 'Solicitud eliminada' })
  } catch (error) {
    console.error('Error deleting purchase request:', error)
    return apiError('Error al eliminar solicitud', 500)
  }
}
