import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rememberMe: z.boolean().optional(),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
})

export const selectCompanySchema = z.object({
  companyId: z.string().min(1, 'ID de empresa requerido'),
})

export const dashboardFiltersSchema = z.object({
  companyId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const incomesFiltersSchema = z.object({
  companyId: z.string().optional(),
  status: z.enum(['PAID', 'PENDING', 'CANCELLED', 'ERROR']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
})

export const expenseSchema = z.object({
  provider: z.string().min(1, 'Proveedor requerido'),
  concept: z.string().min(1, 'Concepto requerido'),
  category: z.string().min(1, 'Categoría requerida'),
  method: z.string().min(1, 'Método de pago requerido'),
  amount: z.number().positive('El monto debe ser positivo'),
  status: z.enum(['PAID', 'PENDING', 'CANCELLED']).optional(),
  date: z.string(),
  refNumber: z.string().optional(),
})

export const expensesFiltersSchema = z.object({
  companyId: z.string().optional(),
  status: z.enum(['PAID', 'PENDING', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

export const activitySchema = z.object({
  type: z.enum(['CALL', 'MEETING', 'QUOTE', 'OTHER']),
  title: z.string().min(1, 'Título requerido'),
  description: z.string().optional(),
  client: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string(),
})

export const activitiesFiltersSchema = z.object({
  companyId: z.string().optional(),
  type: z.enum(['CALL', 'MEETING', 'QUOTE', 'OTHER']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const opportunitySchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  client: z.string().min(1, 'Cliente requerido'),
  value: z.number().positive('El valor debe ser positivo'),
  stage: z.enum(['PROSPECTO', 'PROPUESTA', 'NEGOCIACION', 'CALIFICADO']),
  status: z.string().optional(),
  assignedTo: z.string().optional(),
  closeDate: z.string().optional(),
})

export const opportunitiesFiltersSchema = z.object({
  companyId: z.string().optional(),
  stage: z.enum(['PROSPECTO', 'PROPUESTA', 'NEGOCIACION', 'CALIFICADO']).optional(),
})

export const documentSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  type: z.enum(['DOC', 'PDF', 'XLSX', 'PNG', 'OTHER']),
  concept: z.string().min(1, 'Concepto requerido'),
  category: z.string().optional(),
  fileUrl: z.string().url('URL inválida'),
  fileSize: z.number().positive('Tamaño inválido'),
})

export const documentsFiltersSchema = z.object({
  companyId: z.string().optional(),
  type: z.enum(['DOC', 'PDF', 'XLSX', 'PNG', 'OTHER']).optional(),
})

export const contractSchema = z.object({
  contractId: z.string().min(1, 'ID de contrato requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  concept: z.string().min(1, 'Concepto requerido'),
  category: z.string().optional(),
  party: z.string().min(1, 'Parte requerida'),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED']).optional(),
  fileUrl: z.string().url('URL inválida').optional(),
})

export const contractsFiltersSchema = z.object({
  companyId: z.string().optional(),
  status: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED']).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type SelectCompanyInput = z.infer<typeof selectCompanySchema>
export type DashboardFiltersInput = z.infer<typeof dashboardFiltersSchema>
export type IncomesFiltersInput = z.infer<typeof incomesFiltersSchema>
