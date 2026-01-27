export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
  empresa_id: string
}

export interface User extends BaseEntity {
  email: string
  name: string
  role: UserRole
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MANAGER = 'manager',
}

export interface Company {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
