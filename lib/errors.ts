import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { APIErrorResponse } from './schemas'

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR')
  }
}

export function handleAPIError(error: unknown): NextResponse<APIErrorResponse> {
  console.error('API Error:', error)

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    return NextResponse.json(
      { 
        error: 'Validation failed',
        details: message,
        code: 'VALIDATION_ERROR'
      },
      { status: 400 }
    )
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code
      },
      { status: error.statusCode }
    )
  }

  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }

  // Fallback for unknown errors
  return NextResponse.json(
    { error: 'Unknown error occurred' },
    { status: 500 }
  )
}

export function createLogger(context: string) {
  return {
    info: (message: string, data?: any) => {
      console.log(`[${context}] ${message}`, data ? JSON.stringify(data, null, 2) : '')
    },
    error: (message: string, error?: any) => {
      console.error(`[${context}] ${message}`, error)
    },
    warn: (message: string, data?: any) => {
      console.warn(`[${context}] ${message}`, data ? JSON.stringify(data, null, 2) : '')
    }
  }
}
