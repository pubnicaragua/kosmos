import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getAccessibleCompanies, getCompanyAccess } from '@/lib/company-access'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const type = searchParams.get('type')

    const { companyIds } = await getAccessibleCompanies(decoded.userId)
    if (companyId && !companyIds.includes(companyId)) {
      return apiError('No tienes acceso a esta empresa', 403)
    }

    const where: any = { companyId: companyId || { in: companyIds } }
    if (type) where.type = type

    // Intentar con campos opcionales primero, si falla por P2022 (columnas faltantes) usar versión básica
    let documents
    try {
      const allDocs = await prisma.document.findMany({
        where,
        include: { company: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      
      // Filtrar por visibilidad en memoria para soportar sharedWith JSON
      documents = allDocs.filter((doc: any) => {
        // Documentos públicos/compartidos
        if (!doc.visibility || doc.visibility !== 'PRIVADO') return true
        // Documentos propios
        if (doc.uploadedBy === decoded.userId) return true
        // Documentos compartidos específicamente con este usuario
        if (doc.sharedWith) {
          try {
            const sharedUsers = JSON.parse(doc.sharedWith)
            if (Array.isArray(sharedUsers) && sharedUsers.includes(decoded.userId)) return true
          } catch { /* ignore parse errors */ }
        }
        return false
      })
    } catch (innerErr: any) {
      if (innerErr?.code === 'P2022') {
        // Las columnas area/visibility/category aún no existen en la BD - usar SQL raw
        // En este caso, todos los documentos se tratan como COMPARTIDO (legacy)
        documents = await prisma.$queryRaw`
          SELECT d.id, d.company_id as "companyId", d.name, d.type, d.concept,
                 d.file_url as "fileUrl", d.file_size as "fileSize",
                 d.uploaded_by as "uploadedBy", d.created_at as "createdAt", d.updated_at as "updatedAt",
                 'General' as area, 'COMPARTIDO' as visibility, 'General' as category,
                 json_build_object('name', c.name) as company
          FROM documents d
          JOIN companies c ON c.id = d.company_id
          WHERE d.company_id = ANY(${companyId ? [companyId] : companyIds}::text[])
          ORDER BY d.created_at DESC
        `
      } else {
        throw innerErr
      }
    }

    return apiSuccess(documents)
  } catch (error: any) {
    console.error('Error fetching documents:', error?.message, error?.code)
    return apiError(`Error al obtener documentos: ${error?.message || 'Error desconocido'}`, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const body = await request.json()
    const { companyId, ...docData } = body

    const access = await getCompanyAccess(decoded.userId, companyId)
    if (!access.canAccess) return apiError('No tienes acceso a esta empresa', 403)

    const { area, visibility, category, sharedWith, ...cleanDocData } = docData as any
    let document
    try {
      document = await prisma.document.create({
        data: {
          ...cleanDocData,
          companyId,
          uploadedBy: decoded.userId,
          area: area || 'General',
          visibility: visibility || 'COMPARTIDO',
          category: category || 'General',
          sharedWith: sharedWith ? JSON.stringify(sharedWith) : null,
        },
      })
    } catch (innerErr: any) {
      if (innerErr?.code === 'P2022') {
        // Columnas opcionales aún no migradas - crear sin ellas
        document = await prisma.document.create({
          data: {
            ...cleanDocData,
            companyId,
            uploadedBy: decoded.userId,
          },
        })
      } else {
        throw innerErr
      }
    }

    return apiSuccess(document, undefined, 201)
  } catch (error: any) {
    console.error('Error creating document:', error?.message, error?.code, JSON.stringify(error))
    return apiError(`Error al crear documento: ${error?.message || 'Error desconocido'}`, 500)
  }
}
