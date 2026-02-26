import { NextRequest } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024 // 25MB

const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'ppt',
  'pptx',
  'zip',
  'rar',
  '7z',
])

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/octet-stream',
])

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

    if (!file.name) {
      return errorResponse('Nombre de archivo inválido', 400)
    }

    if (file.size === 0) {
      return errorResponse('El archivo está vacío', 400)
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return errorResponse('El archivo es demasiado grande. Tamaño máximo: 25MB', 400)
    }

    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : ''
    const hasValidExtension = extension ? ALLOWED_EXTENSIONS.has(extension) : false
    const mimeType = (file.type || '').toLowerCase()
    const hasValidMimeType = mimeType ? ALLOWED_MIME_TYPES.has(mimeType) : false

    if (!hasValidExtension && !hasValidMimeType) {
      return errorResponse(
        'Tipo de archivo no permitido. Formatos válidos: imágenes, PDF, Word, Excel, CSV, TXT, PowerPoint y comprimidos.',
        400
      )
    }

    // Generar nombre único
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'bin'
    const fileName = `${timestamp}-${randomStr}.${safeExtension}`

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
