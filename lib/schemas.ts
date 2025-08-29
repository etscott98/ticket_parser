import { z } from 'zod'

// API Request/Response Schemas
export const ProcessRMARequestSchema = z.object({
  rmaNumber: z.string()
    .min(1, 'RMA number is required')
    .regex(/^\d+$/, 'RMA number must contain only digits')
    .transform(val => val.trim()),
  teamsAccessToken: z.string().optional()
})

export const TeamsSearchRequestSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  accessToken: z.string().min(1, 'Access token is required')
})

export const RMANumberParamSchema = z.object({
  rmaNumber: z.string()
    .min(1, 'RMA number is required')
    .regex(/^\d+$/, 'Invalid RMA number format')
})

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  rma: z.string().optional()
})

// Response Types
export const APIErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional()
})

export const APISuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional()
})

// Type exports
export type ProcessRMARequest = z.infer<typeof ProcessRMARequestSchema>
export type TeamsSearchRequest = z.infer<typeof TeamsSearchRequestSchema>
export type RMANumberParam = z.infer<typeof RMANumberParamSchema>
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>
export type APIErrorResponse = z.infer<typeof APIErrorResponseSchema>
export type APISuccessResponse = z.infer<typeof APISuccessResponseSchema>

// Constants
export const RMA_PROCESSING_TIMEOUT = 30000
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100
export const TEAMS_SEARCH_TIMEOUT = 10000
