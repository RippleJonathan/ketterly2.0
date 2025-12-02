import { Database } from './database'

// API Response type
export type ApiResponse<T> = {
  data: T | null
  error: Error | null
  count?: number
}

// Helper to create error responses
export function createErrorResponse(error: unknown): ApiResponse<never> {
  let errorMessage = 'An unknown error occurred'
  
  if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === 'object' && error !== null) {
    // Handle Supabase/PostgrestError which has message, details, hint, code
    const supaError = error as { message?: string; details?: string; hint?: string; code?: string }
    errorMessage = supaError.message || supaError.details || JSON.stringify(error)
    if (supaError.hint) errorMessage += ` (Hint: ${supaError.hint})`
    if (supaError.code) errorMessage += ` [Code: ${supaError.code}]`
  }
  
  console.error('API Error:', error)
  
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
