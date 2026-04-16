import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) return NextResponse.json({ success: false, error: 'companyId es requerido' }, { status: 400 })

    const requests = await prisma.purchaseRequest.findMany({
      where: { companyId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: requests })
  } catch (error) {
    console.error('Error fetching purchase requests:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 })

    const body = await req.json()
    const { 
      companyId, 
      requestingArea, 
      requestType, 
      priority, 
      notes, 
      items 
    } = body

    if (!companyId || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Datos incompletos' }, { status: 400 })
    }

    // Generate Request Number: SC-{Alias}-{Sequence}
    const company = await prisma.company.findUnique({ where: { id: companyId } })
    const alias = company?.name.substring(0, 3).toUpperCase() || 'GEN'
    
    // Get next sequence
    const count = await prisma.purchaseRequest.count({ where: { companyId } })
    const sequence = (count + 1).toString().padStart(4, '0')
    const requestNumber = `SC-${alias}-${sequence}`

    const request = await prisma.purchaseRequest.create({
      data: {
        requestNumber,
        companyId,
        requestingArea,
        requestedBy: (decoded as any).id,
        requestType,
        priority,
        notes,
        status: 'PENDIENTE',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            sku: item.sku || null,
            productName: item.productName,
            category: item.category || null,
            currentStock: item.currentStock || 0,
            minimumStock: item.minimumStock || 0,
            requestedQuantity: item.requestedQuantity,
            reason: item.reason || null,
            monthlyAverage: item.monthlyAverage || 0,
            unitCost: item.unitCost || 0,
            totalCost: item.unitCost * item.requestedQuantity,
          }))
        }
      },
      include: {
        items: true
      }
    })

    return NextResponse.json({ success: true, data: request })
  } catch (error) {
    console.error('Error creating purchase request:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
