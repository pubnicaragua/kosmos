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
  party: z.string().min(1, 'Contraparte requerida'),
  startDate: z.string().min(1, 'Fecha de inicio requerida'),
  endDate: z.string().min(1, 'Fecha de fin requerida'),
  fileUrl: z.string().optional(),
  uploadedBy: z.string().optional(),
  companyId: z.string().min(1, 'Empresa requerida'),
})

// ============================================
// SPRINT 3 - CLIENTES, INVENTARIO, TICKETS
// ============================================

// Clients
export const clientSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  ruc: z.string().optional(),
  cedula: z.string().optional(),
  taxId: z.string().optional(),
  status: z.enum(['PROSPECTO', 'PROPUESTA', 'NEGOCIACION', 'CALIFICADO', 'ACTIVO', 'INACTIVO']).optional(),
  contactName: z.string().optional(),
  notes: z.string().optional(),
  companyId: z.string().min(1, 'Empresa requerida'),
})

// Quotes
export const quoteItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, 'Descripción requerida'),
  quantity: z.number().min(1, 'Cantidad debe ser mayor a 0'),
  unitPrice: z.number().min(0, 'Precio debe ser mayor o igual a 0'),
  discount: z.number().min(0).max(100).optional(),
  tax: z.number().min(0).optional(),
})

export const quoteSchema = z.object({
  quoteNumber: z.string().min(1, 'Número de cotización requerido'),
  clientId: z.string().min(1, 'Cliente requerido'),
  currency: z.string().default('USD'),
  paymentMethod: z.enum(['CONTADO', 'CREDITO']).default('CONTADO'),
  taxApplies: z.boolean().default(true),
  validUntil: z.string().min(1, 'Fecha de validez requerida'),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, 'Debe agregar al menos un item'),
  companyId: z.string().min(1, 'Empresa requerida'),
})

// Products
export const productSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  sku: z.string().min(1, 'SKU requerido'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z.string().default('UNI'),
  stock: z.number().min(0, 'Stock debe ser mayor o igual a 0').optional(),
  minStock: z.number().min(0).optional(),
  cost: z.number().min(0, 'Costo debe ser mayor o igual a 0').optional(),
  price: z.number().min(0, 'Precio debe ser mayor a 0'),
  isActive: z.boolean().optional(),
  companyId: z.string().min(1, 'Empresa requerida'),
})

// Product Categories
export const productCategorySchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  companyId: z.string().min(1, 'Empresa requerida'),
})

// Tickets
export const ticketSchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  description: z.string().optional(),
  clientId: z.string().optional(),
  status: z.enum(['PROCESO1', 'PROCESO2', 'PROCESO3', 'PROCESO4']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
  amount: z.number().min(0).optional(),
  dueDate: z.string().optional(),
  companyId: z.string().min(1, 'Empresa requerida'),
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
