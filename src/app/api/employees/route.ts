import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const employeeSchema = z.object({
  companyId: z.string(),
  employeeCode: z.string(),
  fullName: z.string(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  position: z.string(),
  department: z.string(),
  startDate: z.string(),
  salary: z.number(),
  contractType: z.string(),
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
  socialSecurityNumber: z.string().optional().nullable(),
  bloodType: z.string().optional().nullable(),
  educationLevel: z.string().optional().nullable(),
  benefits: z.string().optional().nullable(),
  status: z.string().optional(),
  photo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) return apiError('companyId requerido', 400)

    // Verify user has access to company
    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId }
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    const employees = await prisma.employee.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    })

    return apiSuccess(employees)
  } catch (error: any) {
    console.error('Error fetching employees:', error)
    return apiError(error?.message || 'Error al obtener empleados', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const validatedData = employeeSchema.parse(body)

    // Verify user has access to company
    const userCompany = await prisma.userCompany.findFirst({
      where: { userId: decoded.userId, companyId: validatedData.companyId }
    })

    if (!userCompany) return apiError('No tienes acceso a esta empresa', 403)

    // Check if employee code already exists
    const existing = await prisma.employee.findUnique({
      where: { employeeCode: validatedData.employeeCode }
    })

    if (existing) return apiError('El código de empleado ya existe', 400)

    const employee = await prisma.employee.create({
      data: {
        companyId: validatedData.companyId,
        employeeCode: validatedData.employeeCode,
        fullName: validatedData.fullName,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        position: validatedData.position,
        department: validatedData.department,
        startDate: new Date(validatedData.startDate),
        salary: validatedData.salary,
        contractType: validatedData.contractType,
        bankName: validatedData.bankName || null,
        accountNumber: validatedData.accountNumber || null,
        address: validatedData.address || null,
        birthDate: validatedData.birthDate ? new Date(validatedData.birthDate) : null,
        emergencyContact: validatedData.emergencyContact || null,
        emergencyPhone: validatedData.emergencyPhone || null,
        socialSecurityNumber: validatedData.socialSecurityNumber || null,
        bloodType: validatedData.bloodType || null,
        educationLevel: validatedData.educationLevel || null,
        benefits: validatedData.benefits || null,
        status: validatedData.status || 'ACTIVO',
        photo: validatedData.photo || null,
        notes: validatedData.notes || null,
      }
    })

    return apiSuccess(employee, undefined, 201)
  } catch (error: any) {
    console.error('Error creating employee:', error)
    if (error?.name === 'ZodError') {
      const fieldErrors = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return apiError(`Datos inválidos: ${fieldErrors}`, 400)
    }
    return apiError(error?.message || 'Error al crear empleado', 500)
  }
}
