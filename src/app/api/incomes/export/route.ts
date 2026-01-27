import { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('UNAUTHORIZED', 'Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    
    if (!payload) {
      return errorResponse('UNAUTHORIZED', 'Token inválido o expirado', 401)
    }

    return successResponse({
      message: 'Funcionalidad de exportación pendiente de implementación',
      url: null,
    })
  } catch (error) {
    console.error('Export incomes error:', error)
    return errorResponse('SERVER_ERROR', 'Error al exportar ingresos', 500)
  }
}
