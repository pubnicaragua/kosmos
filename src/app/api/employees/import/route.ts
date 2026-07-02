import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { companyId, employees, createExpense } = body

    if (!companyId || !employees || !Array.isArray(employees)) {
      return apiError('Datos inválidos', 400)
    }

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const { getModuleAccess } = await import('@/lib/company-access')
    const moduleAccess = await getModuleAccess(decoded.userId, companyId, 'recursos-humanos')
    if (!moduleAccess.canCreate) return apiError('No tienes permisos para crear/importar empleados', 403)

    const results = {
      success: 0,
      errors: 0,
      skipped: 0,
      totalSalary: 0,
      details: [] as any[],
    }

    for (const row of employees) {
      try {
        // Normalizar datos
        const employeeData: any = {
          employeeCode: row.Codigo || row.codigo || `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          fullName: row.Nombre || row.nombre || row.NombreCompleto || 'Sin nombre',
          email: row.Email || row.email || null,
          phone: row.Telefono || row.telefono || row.phone || null,
          position: row.Puesto || row.puesto || row.position || 'Sin puesto',
          department: row.Departamento || row.departamento || row.department || 'General',
          startDate: row.FechaIngreso || row.fechaIngreso || row.startDate || new Date().toISOString().split('T')[0],
          salary: parseFloat(String(row.Salario || row.salario || row.salary || 0).replace(/[^0-9.]/g, '')) || 0,
          contractType: row.TipoContrato || row.tipoContrato || row.contractType || 'Indefinido',
          bankName: row.Banco || row.banco || row.bankName || null,
          accountNumber: row.NumeroCuenta || row.numeroCuenta || row.accountNumber || null,
          address: row.Direccion || row.direccion || row.address || null,
          birthDate: row.FechaNacimiento || row.fechaNacimiento || row.birthDate || null,
          emergencyContact: row.ContactoEmergencia || row.contactoEmergencia || row.emergencyContact || null,
          emergencyPhone: row.TelefonoEmergencia || row.telefonoEmergencia || row.emergencyPhone || null,
          socialSecurityNumber: row.SeguroSocial || row.seguroSocial || row.socialSecurityNumber || null,
          bloodType: row.TipoSangre || row.tipoSangre || row.bloodType || null,
          educationLevel: row.NivelEducacion || row.nivelEducacion || row.educationLevel || null,
          benefits: row.Beneficios || row.beneficios || row.benefits || null,
          status: row.Estado || row.estado || row.status || 'ACTIVO',
          notes: row.Notas || row.notas || row.notes || null,
          companyId,
        }

        // Verificar si ya existe por código
        const existing = await prisma.employee.findFirst({
          where: {
            companyId,
            employeeCode: employeeData.employeeCode,
          },
        })

        if (existing) {
          results.skipped++
          results.details.push({ row: employeeData, error: 'Código de empleado ya existe' })
          continue
        }

        // Crear empleado
        await prisma.employee.create({
          data: employeeData,
        })

        results.success++
        results.totalSalary += employeeData.salary
      } catch (err: any) {
        results.errors++
        results.details.push({ row, error: err.message })
      }
    }

    // Crear gasto de nómina si se solicitó
    if (createExpense && results.success > 0 && results.totalSalary > 0) {
      try {
        const today = new Date()
        const period = `${today.toLocaleString('es', { month: 'long' })} ${today.getFullYear()}`
        
        await prisma.expense.create({
          data: {
            companyId,
            date: today,
            refNumber: `NOMINA-${Date.now()}`,
            provider: 'Nómina de Empleados',
            concept: `Planilla de ${period} - ${results.success} empleados`,
            category: 'Nómina',
            method: 'Transferencia',
            amount: results.totalSalary,
            status: 'PENDING',
          },
        })
      } catch (expenseErr) {
        console.error('Error creating expense:', expenseErr)
      }
    }

    return apiSuccess({
      message: `Importación completada: ${results.success} empleados importados, ${results.skipped} omitidos, ${results.errors} errores`,
      ...results,
      expenseCreated: createExpense && results.success > 0,
    })
  } catch (error: any) {
    console.error('Error importing employees:', error)
    return apiError(`Error al importar empleados: ${error.message}`, 500)
  }
}
