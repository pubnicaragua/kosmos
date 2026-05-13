import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getCompanyAccess, getModuleAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

const isAdminRole = (role?: string | null) =>
  role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER'

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
    const isDeptApprover = departmentId
      ? await prisma.userDepartment.findFirst({
          where: {
            departmentId,
            userId: decoded.userId,
            isApprover: true,
          },
        })
      : null
    const canApprove = isAdminRole(access.effectiveRole) || Boolean(isDeptApprover)

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
        canApprove,
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

    const moduleAccess = await getModuleAccess(decoded.userId, currentRequest.companyId, 'solicitudes-compra')
    if (!moduleAccess.canEdit) {
      return NextResponse.json({ success: false, error: 'No tienes permisos para editar solicitudes de compra' }, { status: 403 })
    }

    const currentDepartmentId = currentRequest.departmentId
    const isDeptApprover = currentDepartmentId
      ? await prisma.userDepartment.findFirst({
          where: {
            departmentId: currentDepartmentId,
            userId: decoded.userId,
            isApprover: true,
          },
        })
      : null
    const canApprove = isAdminRole(access.effectiveRole) || Boolean(isDeptApprover)

    if (status && !canApprove) {
      return NextResponse.json({ success: false, error: 'No tienes permisos para aprobar esta solicitud' }, { status: 403 })
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
    if (purchaseOrderUrl !== undefined) updateData.purchaseOrderUrl = purchaseOrderUrl
    if (evidenceUrl !== undefined) updateData.evidenceUrl = evidenceUrl
    if (nextDepartmentId !== undefined) updateData.departmentId = nextDepartmentId
    if (status === 'APROBADA') {
      updateData.approvedBy = decoded.userId
      updateData.approvedAt = new Date()
    } else if (status === 'RECHAZADA') {
      updateData.rejectedReason = rejectedReason || 'Rechazado por el administrador'
    } else if (status === 'COMPRADO' && currentRequest.status !== 'COMPRADO') {
      updateData.purchasedAt = new Date()
      
      // CREATE EXPENSE AUTOMATICALLY
      const totalAmount = currentRequest.items.reduce((sum, item) => sum + (item.totalCost || 0), 0)
      const expense = await prisma.expense.create({
        data: {
          companyId: currentRequest.companyId,
          provider: 'Compras Directas',
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

      // UPDATE INVENTORY AUTOMATICALLY
      for (const item of currentRequest.items) {
        const quantityToReceive = receiptMap.size > 0
          ? receiptMap.get(item.id) || 0
          : item.requestedQuantity

        if (item.productId && quantityToReceive > 0) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: quantityToReceive
              }
            }
          })
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
      },
    })
  } catch (error) {
    console.error('Error updating purchase request:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
