import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getCompanyAccess, getModuleAccess } from '@/lib/company-access'

export const dynamic = 'force-dynamic'

const MODULES = [
  'dashboard', 'clientes', 'ingresos', 'gastos', 'actividades',
  'pipeline-ventas', 'documentos', 'contratos', 'inventario',
  'solicitudes-compra', 'cotizaciones', 'notificaciones',
  'tickets-soporte', 'marketing', 'entregables', 'recursos-humanos', 'sistema',
]

const isMissingCustomRoleColumn = (error: any) => {
  if (error?.code !== 'P2022') return false

  const errorText = `${error?.meta?.column_name || ''} ${error?.message || ''}`.toLowerCase()
  return errorText.includes('custom_role_id')
}

const PREDEFINED_ROLES = [
  {
    name: 'Vendedor',
    description: 'Acceso a clientes, pipeline y cotizaciones',
    color: '#10b981',
    modules: { clientes: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false }, 'pipeline-ventas': { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false }, actividades: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: false }, dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false } },
  },
  {
    name: 'RRHH',
    description: 'Gestión de personal y actividades internas',
    color: '#f59e0b',
    modules: { actividades: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true }, documentos: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true }, contratos: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true }, dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false } },
  },
  {
    name: 'Inventario',
    description: 'Control de productos e inventario',
    color: '#8b5cf6',
    modules: { inventario: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true }, dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false } },
  },
  {
    name: 'Contabilidad',
    description: 'Acceso a ingresos, gastos y reportes financieros',
    color: '#3b82f6',
    modules: { ingresos: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true }, gastos: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true }, contratos: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true }, dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true } },
  },
  {
    name: 'Marketing',
    description: 'Gestión de campañas y entregables',
    color: '#ec4899',
    modules: { marketing: { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true }, entregables: { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true }, clientes: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false }, dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false } },
  },
  {
    name: 'Soporte',
    description: 'Gestión de tickets de soporte',
    color: '#ef4444',
    modules: { 'tickets-soporte': { canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true }, clientes: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false }, dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false } },
  },
]

const isMissingTable = (error: any) => {
  const msg = `${error?.message || ''}`.toLowerCase()
  const code = error?.code || ''
  return code === 'P2021' || msg.includes('does not exist') || msg.includes('relation') || msg.includes('no such table') || msg.includes('custom_roles')
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) return apiError('companyId requerido', 400)

    let canAccess = false
    try {
      const access = await getCompanyAccess(decoded.userId, companyId)
      canAccess = access.canAccess
    } catch (accessError: any) {
      console.error('getCompanyAccess error:', accessError?.message, accessError?.code)
      // Si falla por columna faltante, verificar acceso de forma básica
      try {
        const uc = await prisma.userCompany.findFirst({ where: { userId: decoded.userId, companyId } })
        canAccess = Boolean(uc)
      } catch {
        canAccess = true // asumir acceso si no podemos verificar
      }
    }
    if (!canAccess) return apiError('Sin acceso a esta empresa', 403)

    let roles: any[] = []

    try {
      roles = await prisma.customRole.findMany({
        where: { companyId },
        include: {
          permissions: true,
          userCompanies: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      })
    } catch (error: any) {
      console.warn('customRole query error:', error?.code, error?.message)
      if (isMissingTable(error)) {
        // Tabla custom_roles no existe en producción — devolver vacío
        return apiSuccess({ roles: [], modules: MODULES, predefinedRoles: PREDEFINED_ROLES })
      }
      if (isMissingCustomRoleColumn(error)) {
        console.warn('Falta columna custom_role_id en user_companies')
        try {
          const rolesWithoutUsers = await prisma.customRole.findMany({
            where: { companyId },
            include: { permissions: true },
            orderBy: { createdAt: 'asc' },
          })
          roles = rolesWithoutUsers.map((role) => ({ ...role, userCompanies: [] }))
        } catch {
          return apiSuccess({ roles: [], modules: MODULES, predefinedRoles: PREDEFINED_ROLES })
        }
      } else {
        throw error
      }
    }

    return apiSuccess({ roles, modules: MODULES, predefinedRoles: PREDEFINED_ROLES })
  } catch (error: any) {
    console.error('Error fetching roles - full error:', error?.message, '| code:', error?.code, '| stack:', error?.stack?.split('\n')[0])
    return apiError('Error al obtener roles', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)
    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { companyId, name, description, color, permissions, fromPredefined } = body

    if (!companyId || !name) return apiError('companyId y name son requeridos', 400)

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('Sin acceso a esta empresa', 403)
    
    // Verificar si es admin O tiene permisos personalizados en módulo sistema
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(access.effectiveRole || '')
    let hasCustomPermission = false
    try {
      const sistemaAccess = await getModuleAccess(decoded.userId, companyId, 'sistema')
      hasCustomPermission = sistemaAccess.canCreate || sistemaAccess.canEdit
    } catch {
      // Si falla, asumir sin permisos personalizados
    }
    if (!isAdmin && !hasCustomPermission) {
      return apiError('No tienes permisos para gestionar roles. Necesitas ser Admin o tener permisos de Crear/Editar en el módulo Sistema.', 403)
    }

    let rolePermissions = permissions
    if (fromPredefined) {
      const predefined = PREDEFINED_ROLES.find((r) => r.name === fromPredefined)
      if (predefined) {
        rolePermissions = Object.entries(predefined.modules).map(([module, perms]) => ({
          module,
          ...perms,
        }))
      }
    }

    const role = await prisma.customRole.create({
      data: {
        companyId,
        name,
        description: description || null,
        color: color || '#6366f1',
        permissions: rolePermissions
          ? {
              create: rolePermissions.map((p: any) => ({
                module: p.module,
                canView: p.canView ?? true,
                canCreate: p.canCreate ?? false,
                canEdit: p.canEdit ?? false,
                canDelete: p.canDelete ?? false,
                canExport: p.canExport ?? false,
              })),
            }
          : undefined,
      },
      include: { permissions: true },
    })

    return apiSuccess(role, undefined, 201)
  } catch (error: any) {
    if (error?.code === 'P2002') return apiError('Ya existe un rol con ese nombre en esta empresa', 409)
    if (isMissingTable(error)) {
      console.error('Error creating role: tabla custom_roles no existe en la BD —', error?.message)
      return apiError('La tabla de roles no existe en la base de datos. Ejecuta la migración SQL.', 503)
    }
    console.error('Error creating role:', error?.message, '| code:', error?.code)
    return apiError('Error al crear rol', 500)
  }
}
