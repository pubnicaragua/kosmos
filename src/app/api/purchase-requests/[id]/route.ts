import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getCompanyAccess, getModuleAccess } from '@/lib/company-access'
import { getPurchasePermissions, type PurchasePermissions } from '@/lib/purchase-permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 })

    const request = await prisma.purchaseRequest.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        company: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!request) return NextResponse.json({ success: false, error: 'Solicitud no encontrada' }, { status: 404 })

    const access = await getCompanyAccess(decoded.userId, request.companyId)
    if (!access.canAccess) {
      return NextResponse.json({ success: false, error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const departmentId = request.department?.id || request.departmentId
    const perms = await getPurchasePermissions(decoded.userId, request.companyId, departmentId)

    const [requestedByUser, approvedByUser] = await Promise.all([
      request.requestedBy
        ? prisma.user.findUnique({ where: { id: request.requestedBy }, select: { id: true, name: true } })
        : Promise.resolve(null),
      request.approvedBy
        ? prisma.user.findUnique({ where: { id: request.approvedBy }, select: { id: true, name: true } })
        : Promise.resolve(null),
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...request,
        requestingArea: request.department?.name || request.requestingArea,
        requestedByName: requestedByUser?.name || null,
        approvedByName: approvedByUser?.name || null,
        canApprove: perms.canApprove,
        canReceive: perms.canReceive,
        canBuy: perms.canBuy,
      }
    })
  } catch (error) {
    console.error('Error fetching purchase request detail:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 })

    const body = await req.json()
    const {
      status,
      rejectedReason,
      notes,
      quotationUrl,
      selectedQuotationUrl,
      supplierName,
      finalAmount,
      purchaseOrderUrl,
      evidenceUrl,
      departmentId: nextDepartmentId,
      receivedItems,
    } = body

    const currentRequest = await prisma.purchaseRequest.findUnique({
      where: { id: params.id },
      include: { items: true }
    })

    if (!currentRequest) return NextResponse.json({ success: false, error: 'Solicitud no encontrada' }, { status: 404 })

    const access = await getCompanyAccess(decoded.userId, currentRequest.companyId)
    if (!access.canAccess) {
      return NextResponse.json({ success: false, error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const currentDepartmentId = currentRequest.departmentId
    const perms = await getPurchasePermissions(decoded.userId, currentRequest.companyId, currentDepartmentId)
    const { canApprove, canReceive, canBuy } = perms

    const moduleAccess = await getModuleAccess(decoded.userId, currentRequest.companyId, 'solicitudes-compra')
    if (!moduleAccess.canEdit && !canApprove && !canReceive && !canBuy) {
      return NextResponse.json({ success: false, error: 'No tienes permisos para editar solicitudes de compra' }, { status: 403 })
    }

    if (status) {
      const statusPermission: Record<string, keyof PurchasePermissions> = {
        APROBADA: 'canApprove',
        RECHAZADA: 'canApprove',
        COMPRADO: 'canBuy',
        RECIBIDO: 'canReceive',
      }
      const required = statusPermission[status]
      if (required && !perms[required]) {
        return NextResponse.json(
          { success: false, error: `No tienes permisos para marcar como ${status}` },
          { status: 403 }
        )
      }
    }

    if (status === 'APROBADA') {
      const quotationOptions = Array.isArray(currentRequest.quotationFiles)
        ? currentRequest.quotationFiles.filter((url: any) => typeof url === 'string' && url.trim())
        : currentRequest.quotationUrl
          ? [currentRequest.quotationUrl]
          : []
      const chosenQuotation = selectedQuotationUrl || quotationUrl
      if (quotationOptions.length > 0 && (!chosenQuotation || !quotationOptions.includes(chosenQuotation))) {
        return NextResponse.json({ success: false, error: 'Debes seleccionar una cotización válida' }, { status: 400 })
      }
      if (!supplierName || typeof supplierName !== 'string' || !supplierName.trim()) {
        return NextResponse.json({ success: false, error: 'Debes indicar el proveedor seleccionado' }, { status: 400 })
      }
      if (!Number.isFinite(Number(finalAmount)) || Number(finalAmount) <= 0) {
        return NextResponse.json({ success: false, error: 'Debes indicar el precio final aprobado' }, { status: 400 })
      }
    }

    if (status === 'COMPRADO') {
      const purchaseProof = purchaseOrderUrl ?? currentRequest.purchaseOrderUrl
      if (!purchaseProof) {
        return NextResponse.json({ success: false, error: 'Debes adjuntar comprobante o soporte de compra' }, { status: 400 })
      }
    }

    if (status === 'RECIBIDO') {
      const receptionProof = evidenceUrl ?? currentRequest.evidenceUrl
      if (!receptionProof) {
        return NextResponse.json({ success: false, error: 'Debes adjuntar evidencia de recepción' }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (quotationUrl !== undefined) updateData.quotationUrl = quotationUrl
    if (selectedQuotationUrl !== undefined) updateData.selectedQuotationUrl = selectedQuotationUrl
    if (supplierName !== undefined) updateData.supplierName = supplierName
    if (finalAmount !== undefined) updateData.finalAmount = Number(finalAmount)
    if (purchaseOrderUrl !== undefined) updateData.purchaseOrderUrl = purchaseOrderUrl
    if (evidenceUrl !== undefined) updateData.evidenceUrl = evidenceUrl
    if (nextDepartmentId !== undefined) updateData.departmentId = nextDepartmentId
    if (status === 'APROBADA') {
      updateData.approvedBy = decoded.userId
      updateData.approvedAt = new Date()
      updateData.quotationUrl = selectedQuotationUrl || quotationUrl || currentRequest.quotationUrl
    } else if (status === 'RECHAZADA') {
      updateData.rejectedReason = rejectedReason || 'Rechazado por el administrador'
    } else if (status === 'COMPRADO' && currentRequest.status !== 'COMPRADO') {
      updateData.purchasedAt = new Date()
      
      // CREATE EXPENSE AUTOMATICALLY
      const totalAmount = Number(currentRequest.finalAmount) > 0
        ? Number(currentRequest.finalAmount)
        : currentRequest.items.reduce((sum, item) => sum + (item.totalCost || 0), 0)
      const expense = await prisma.expense.create({
        data: {
          companyId: currentRequest.companyId,
          provider: currentRequest.supplierName || 'Compras Directas',
          concept: `Compra derivada de Solicitud ${currentRequest.requestNumber}`,
          category: 'Compras',
          method: 'Efectivo/Transferencia',
          amount: totalAmount,
          status: 'PAID',
          date: new Date(),
          refNumber: `REQ-${currentRequest.requestNumber}`,
        }
      })
      updateData.expenseId = expense.id
    } else if (status === 'RECIBIDO' && currentRequest.status !== 'RECIBIDO') {
      updateData.receivedAt = new Date()

      const validReceivedItems = Array.isArray(receivedItems)
        ? receivedItems.filter(
            (entry: any) =>
              entry &&
              typeof entry.itemId === 'string' &&
              Number.isFinite(Number(entry.receivedQuantity)) &&
              Number(entry.receivedQuantity) > 0
          )
        : []

      const receiptMap = new Map<string, number>(
        validReceivedItems.map((entry: any) => [entry.itemId, Number(entry.receivedQuantity)])
      )
      const totalRequestedQuantity = currentRequest.items.reduce(
        (sum, item) => sum + (Number(item.requestedQuantity) || 0),
        0
      )
      const approvedUnitCost = Number(currentRequest.finalAmount) > 0 && totalRequestedQuantity > 0
        ? Number(currentRequest.finalAmount) / totalRequestedQuantity
        : 0

      // UPDATE INVENTORY AUTOMATICALLY
      for (const item of currentRequest.items) {
        const quantityToReceive = receiptMap.size > 0
          ? receiptMap.get(item.id) || 0
          : item.requestedQuantity

        if (quantityToReceive > 0) {
          if (item.productId) {
            // Update existing product
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: quantityToReceive
                }
              }
            })
          } else {
            // Create new product in inventory
            const categoryId = item.category 
              ? (await prisma.productCategory.findFirst({
                  where: { 
                    companyId: currentRequest.companyId,
                    name: item.category 
                  }
                }))?.id || null
              : null

            const inventoryCost = Number(item.unitCost) > 0 ? Number(item.unitCost) : approvedUnitCost

            await prisma.product.create({
              data: {
                companyId: currentRequest.companyId,
                name: item.productName,
                sku: item.sku || `AUTO-${Date.now()}`,
                categoryId,
                stock: quantityToReceive,
                minStock: item.minimumStock || 0,
                cost: inventoryCost,
                publicPrice: inventoryCost * 1.3,
                minPrice: inventoryCost * 1.2,
                distributorPrice: inventoryCost * 1.1,
                type: 'PRODUCT'
              }
            })
          }
        }
      }
    }

    if (notes) updateData.notes = notes

    await prisma.purchaseRequest.update({
      where: { id: params.id },
      data: updateData,
      include: { items: true }
    })

    const updated = await prisma.purchaseRequest.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        company: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const [requestedByUser, approvedByUser] = await Promise.all([
      updated.requestedBy
        ? prisma.user.findUnique({ where: { id: updated.requestedBy }, select: { id: true, name: true } })
        : Promise.resolve(null),
      updated.approvedBy
        ? prisma.user.findUnique({ where: { id: updated.approvedBy }, select: { id: true, name: true } })
        : Promise.resolve(null),
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        requestingArea: updated.department?.name || updated.requestingArea,
        requestedByName: requestedByUser?.name || null,
        approvedByName: approvedByUser?.name || null,
        canApprove,
        canReceive,
        canBuy,
      },
    })
  } catch (error) {
    console.error('Error updating purchase request:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
