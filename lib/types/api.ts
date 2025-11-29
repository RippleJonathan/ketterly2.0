import { Database } from './database'

// API Response type
export type ApiResponse<T> = {
  data: T | null
  error: Error | null
  count?: number
}

// Helper to create error responses
export function createErrorResponse(error: unknown): ApiResponse<never> {
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
  return {
    data: null,
    error: new Error(errorMessage),
  }
}

// Helper to create success responses
export function createSuccessResponse<T>(data: T, count?: number): ApiResponse<T> {
  return {
    data,
    error: null,
    count,
  }
}
