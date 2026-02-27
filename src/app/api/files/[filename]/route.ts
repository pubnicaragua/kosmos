import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
}

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params

    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Nombre de archivo inválido' }, { status: 400 })
    }

    const IS_PRODUCTION = process.env.NODE_ENV === 'production'
    const primaryDir = IS_PRODUCTION ? '/tmp/uploads' : join(process.cwd(), 'public', 'uploads')
    const fallbackDir = IS_PRODUCTION ? join(process.cwd(), 'public', 'uploads') : '/tmp/uploads'
    let filePath = join(primaryDir, filename)
    if (!existsSync(filePath)) {
      filePath = join(fallbackDir, filename)
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }

    const buffer = await readFile(filePath)
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const mimeType = MIME_MAP[ext] || 'application/octet-stream'

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=86400',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('File serve error:', error?.message)
    return NextResponse.json({ error: 'Error al leer el archivo' }, { status: 500 })
  }
}
