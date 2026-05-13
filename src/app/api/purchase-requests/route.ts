import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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

    const departments = await prisma.department.findMany({
      where: { companyId },
      select: { id: true, name: true },
    })
    const departmentMap = new Map(departments.map((dept) => [dept.id, dept.name]))

    const requests = await prisma.purchaseRequest.findMany({
      where: { companyId },
      include: {
        items: true,
        department: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    const requesterIds = Array.from(
      new Set(requests.map((req) => req.requestedBy).filter(Boolean))
    )
    const requesters = requesterIds.length
      ? await prisma.user.findMany({
          where: { id: { in: requesterIds } },
          select: { id: true, name: true },
        })
      : []
    const requesterMap = new Map(requesters.map((user) => [user.id, user.name]))

    // Map to include department name as requestingArea for display
    const mappedRequests = requests.map(req => ({
      ...req,
      requestingArea: req.department?.name || departmentMap.get(req.requestingArea) || req.requestingArea || 'Sin departamento',
      requestedByName: requesterMap.get(req.requestedBy) || null,
    }))

    return NextResponse.json({ success: true, data: mappedRequests })
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

    const department = requestingArea
      ? await prisma.department.findUnique({
          where: { id: requestingArea },
          select: { id: true, name: true },
        })
      : null

    const request = await prisma.purchaseRequest.create({
      data: {
        requestNumber,
        companyId,
        requestingArea: department?.name || requestingArea,
        departmentId: department?.id || null,
        requestedBy: decoded.userId,
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

    // Notify department approvers and company admins
    try {
      const notifyUserIds = new Set<string>()

      // Get department approvers if requestingArea is specified
      const departmentId = department?.id || requestingArea
      if (departmentId) {
        const departmentUsers = await prisma.userDepartment.findMany({
          where: {
            departmentId,
            isApprover: true
          }
        })
        departmentUsers.forEach(du => notifyUserIds.add(du.userId))
      }

      // Also notify company admins
      const companyAdmins = await prisma.userCompany.findMany({
        where: {
          companyId: companyId,
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      })
      companyAdmins.forEach(ca => notifyUserIds.add(ca.userId))

      // Create notifications for all unique users
      for (const userId of Array.from(notifyUserIds)) {
        if (userId !== decoded.userId) {
          await prisma.notification.create({
            data: {
              userId,
              title: 'Solicitud de Compra Requiere Aprobación',
              message: `Solicitud ${requestNumber} (${requestType}) - Prioridad ${priority} - Monto estimado: $${items.reduce((sum: number, i: any) => sum + (i.unitCost * i.requestedQuantity), 0).toFixed(2)}`,
              type: 'ASSIGNMENT',
              link: `/solicitudes-compra/${request.id}`
            }
          })
        }
      }
    } catch (notifError) {
      console.error('Error creating notifications:', notifError)
    }

    return NextResponse.json({ success: true, data: request })
  } catch (error) {
    console.error('Error creating purchase request:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
