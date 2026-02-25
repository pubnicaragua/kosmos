import { NextRequest } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return errorResponse('No se proporcionó ningún archivo', 400)
    }

    // Aceptar cualquier formato de respaldo y aumentar tamaño máximo.
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (file.size > maxSize) {
      return errorResponse('El archivo es demasiado grande. Tamaño máximo: 25MB', 400)
    }

    // Generar nombre único
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
    const fileName = `${timestamp}-${randomStr}.${extension}`

    // Guardar en public/uploads
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    const filePath = join(uploadDir, fileName)

    // Crear directorio si no existe
    await mkdir(uploadDir, { recursive: true })

    await writeFile(filePath, buffer)

    // Retornar URL pública
    const publicUrl = `/uploads/${fileName}`

    return successResponse({
      url: publicUrl,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return errorResponse('Error al subir el archivo', 500)
  }
}
