import { NextRequest } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// UPLOAD_DIR: Usar /tmp/uploads por defecto (tiene permisos en todos los entornos)
// Opcional: Configurar UPLOAD_DIR en .env para persistencia
const UPLOAD_DIR = '/tmp/uploads'

// URL base para acceder a los archivos
const UPLOAD_BASE_URL = '/api/files'

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024 // 100MB (supports videos)

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
  'mp4',
  'mov',
  'avi',
  'webm',
  'mkv',
  'wmv',
  'flv',
  'm4v',
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
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/mp2t',
  'video/mpeg',
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
      return errorResponse('El archivo es demasiado grande. Tamaño máximo: 100MB', 400)
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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Guardar archivo en /tmp/uploads (tiene permisos en todos los entornos)
    const uploadDir = '/tmp/uploads'
    const filePath = `${uploadDir}/${fileName}`
    
    console.log('[UPLOAD] Saving file:', {
      uploadDir,
      fileName,
      filePath,
      fileSize: buffer.length,
    })
    
    // Crear directorio si no existe
    await mkdir(uploadDir, { recursive: true })
    console.log('[UPLOAD] Directory created/verified:', uploadDir)
    
    await writeFile(filePath, buffer)
    console.log('[UPLOAD] File written successfully:', filePath)
    
    // Verificar que el archivo existe
    const { existsSync } = await import('fs')
    const fileExists = existsSync(filePath)
    console.log('[UPLOAD] File exists after write:', fileExists)
    
    // Construir URL pública
    const publicUrl = `${UPLOAD_BASE_URL}/${fileName}`

    return successResponse({
      url: publicUrl,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    console.error('Upload error stack:', error?.stack)
    console.error('Upload error message:', error?.message)
    return errorResponse(`Error al subir el archivo: ${error?.message || 'Error desconocido'}`, 500)
  }
}
