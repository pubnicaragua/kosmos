import { NextResponse } from 'next/server'

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  message: string
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

export function successResponse<T>(data: T, message?: string, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    } as ApiSuccessResponse<T>,
    { status }
  )
}

export function errorResponse(error: string, status: number = 400, message?: string) {
  return NextResponse.json(
    {
      success: false,
      error,
      message: message || error,
    } as ApiErrorResponse,
    { status }
  )
}

// Aliases para compatibilidad con endpoints
export const apiSuccess = successResponse
export const apiError = errorResponse
