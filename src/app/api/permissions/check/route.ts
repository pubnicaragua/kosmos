import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getModuleAccess } from '@/lib/company-access'
import { apiSuccess, apiError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const moduleName = searchParams.get('module')
    const companyId = searchParams.get('companyId')

    if (!moduleName || !companyId) {
      return apiError('Módulo y companyId requeridos', 400)
    }

    const permissions = await getModuleAccess(decoded.userId, companyId, moduleName)

    return apiSuccess(permissions)
  } catch (error) {
    console.error('Error checking permissions:', error)
    return apiError('Error al verificar permisos', 500)
  }
}
