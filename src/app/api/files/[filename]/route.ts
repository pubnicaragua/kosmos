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
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  m4v: 'video/mp4',
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

    // Search all candidate directories in priority order
    const candidateDirs: string[] = []
    if (process.env.UPLOAD_DIR) candidateDirs.push(process.env.UPLOAD_DIR)
    candidateDirs.push(join(process.cwd(), 'uploads'))
    candidateDirs.push(join(process.cwd(), 'public', 'uploads'))
    candidateDirs.push('/tmp/uploads')

    let filePath: string | null = null
    for (const dir of candidateDirs) {
      const candidate = join(dir, filename)
      if (existsSync(candidate)) {
        filePath = candidate
        break
      }
    }

    if (!filePath) {
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
