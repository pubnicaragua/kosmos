import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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
      },
    })

    if (!request) return NextResponse.json({ success: false, error: 'Solicitud no encontrada' }, { status: 404 })

    return NextResponse.json({ success: true, data: request })
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
    const { status, rejectedReason, notes, quotationUrl, purchaseOrderUrl, evidenceUrl, departmentId } = body

    const currentRequest = await prisma.purchaseRequest.findUnique({
      where: { id: params.id },
      include: { items: true }
    })

    if (!currentRequest) return NextResponse.json({ success: false, error: 'Solicitud no encontrada' }, { status: 404 })

    const updateData: any = {}
    if (status) updateData.status = status
    if (quotationUrl !== undefined) updateData.quotationUrl = quotationUrl
    if (purchaseOrderUrl !== undefined) updateData.purchaseOrderUrl = purchaseOrderUrl
    if (evidenceUrl !== undefined) updateData.evidenceUrl = evidenceUrl
    if (departmentId !== undefined) updateData.departmentId = departmentId
    if (status === 'APROBADA') {
      updateData.approvedBy = (decoded as any).id
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

      // UPDATE INVENTORY AUTOMATICALLY
      for (const item of currentRequest.items) {
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

    if (notes) updateData.notes = notes

    const updated = await prisma.purchaseRequest.update({
      where: { id: params.id },
      data: updateData,
      include: { items: true }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating purchase request:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
