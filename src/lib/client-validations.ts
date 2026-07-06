import { prisma } from '@/lib/prisma'
import { validateCedula, validateRuc } from '@/lib/nicaragua-validators'

export interface RowValidationError {
  field: string
  message: string
}

export function validateRowFormat(row: {
  name?: string
  email?: string
  cedula?: string
  ruc?: string
  phone?: string
}): RowValidationError[] {
  const errors: RowValidationError[] = []

  if (!row.name?.trim()) {
    errors.push({ field: 'name', message: 'Nombre es requerido' })
  }

  if (row.email?.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(row.email.trim())) {
      errors.push({ field: 'email', message: `Email "${row.email}" no es válido` })
    }
  }

  if (row.cedula?.trim()) {
    const val = validateCedula(row.cedula)
    if (!val.valid) {
      errors.push({ field: 'cedula', message: `Cédula "${row.cedula}": ${val.message}` })
    }
  }

  if (row.ruc?.trim()) {
    const val = validateRuc(row.ruc)
    if (!val.valid) {
      errors.push({ field: 'ruc', message: `RUC "${row.ruc}": ${val.message}` })
    }
  }

  return errors
}

export async function checkDbDuplicateCedulaRuc(
  companyId: string,
  fields: { cedula?: string; ruc?: string },
  excludeClientId?: string
): Promise<RowValidationError[]> {
  const errors: RowValidationError[] = []

  if (fields.cedula?.trim()) {
    const existing = await prisma.client.findFirst({
      where: {
        companyId,
        cedula: fields.cedula.trim(),
        ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
      },
      select: { id: true, name: true },
    })
    if (existing) {
      errors.push({
        field: 'cedula',
        message: `Cédula "${fields.cedula}" ya está registrada en cliente "${existing.name}"`,
      })
    }
  }

  if (fields.ruc?.trim()) {
    const existing = await prisma.client.findFirst({
      where: {
        companyId,
        ruc: fields.ruc.trim(),
        ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
      },
      select: { id: true, name: true },
    })
    if (existing) {
      errors.push({
        field: 'ruc',
        message: `RUC "${fields.ruc}" ya está registrado en cliente "${existing.name}"`,
      })
    }
  }

  return errors
}

export function findFileDuplicates(
  rows: { cedula?: string; ruc?: string }[],
  rowIndex: number
): RowValidationError[] {
  const errors: RowValidationError[] = []
  const current = rows[rowIndex]

  for (let i = 0; i < rows.length; i++) {
    if (i === rowIndex) continue
    const other = rows[i]

    if (current.cedula?.trim() && other.cedula?.trim() && current.cedula.trim() === other.cedula.trim()) {
      errors.push({
        field: 'cedula',
        message: `Cédula "${current.cedula}" duplicada en fila ${i + 2} del archivo`,
      })
      break
    }
  }

  for (let i = 0; i < rows.length; i++) {
    if (i === rowIndex) continue
    const other = rows[i]

    if (current.ruc?.trim() && other.ruc?.trim() && current.ruc.trim() === other.ruc.trim()) {
      errors.push({
        field: 'ruc',
        message: `RUC "${current.ruc}" duplicado en fila ${i + 2} del archivo`,
      })
      break
    }
  }

  return errors
}

export function groupErrors(errors: RowValidationError[]): { error: string; count: number }[] {
  const map = new Map<string, number>()
  for (const e of errors) {
    map.set(e.message, (map.get(e.message) || 0) + 1)
  }
  return Array.from(map.entries()).map(([error, count]) => ({ error, count }))
}
