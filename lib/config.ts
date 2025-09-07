import { AppConfiguration } from './interfaces'

// Application Configuration
export const APP_CONFIG: AppConfiguration = {
  // Database configuration
  SUPABASE_TABLE_NAME: 'rma_tickets',
  
  // Processing status values
  PROCESSING_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed'
  },

  // Freshdesk configuration
  FRESHDESK_STATUS_CODES: {
    2: 'Open',
    3: 'Pending',
    4: 'Resolved',
    5: 'Closed',
    6: 'Waiting on Customer',
    7: 'Waiting on Third Party'
  },

  // Device ID patterns
  DEVICE_ID_PATTERNS: {
    REGULAR: /\b\d{10}\b/g,
    VID_PREFIX: /VID\s*(\d{10})/gi,
    ID_PREFIX: /ID\s*(\d{10})/gi,
    SERIAL_PREFIX: /Serial\s*(?:Number|#|:)?\s*(\d{10})/gi,
    DEVICE_PREFIX: /Device\s*(?:ID|#|:)?\s*(\d{10})/gi,
    FORMATTED_DASH: /(\d{4})[- ]?(\d{3})[- ]?(\d{3})/g,
    FORMATTED_REVERSE: /(\d{3})[- ]?(\d{3})[- ]?(\d{4})/g,
    FIVE_A_EXACT: /\b5A[A-Z0-9]{8}\b/gi,
    FIVE_A_FORMATTED: /5A[A-Z0-9\-\.\s]{8,}/gi,
    FIVE_A_GENERAL: /5A[A-Z0-9]{8}/gi
  },

  // Timeouts (in milliseconds)
  TIMEOUTS: {
    RMA_PROCESSING: 30000,
    TEAMS_SEARCH: 10000,
    FRESHDESK_API: 15000,
    OPENAI_API: 20000
  },

  // Processing limits
  LIMITS: {
    MAX_DEVICE_IDS: 20,
    MAX_TEAMS_SEARCH_TERMS: 10,
    MAX_CHAT_MESSAGES_PER_SEARCH: 500,
    MAX_CHATS_TO_SEARCH: 50
  }
}

// Environment-specific configuration
export const ENV_CONFIG = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Required environment variables
  requiredEnvVars: [
    'FRESHDESK_API_KEY',
    'FRESHDESK_DOMAIN',
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ],
  
  // Optional environment variables (with defaults)
  optionalEnvVars: {
    MICROSOFT_CLIENT_ID: null,
    MICROSOFT_CLIENT_SECRET: null,
    MICROSOFT_TENANT_ID: null,
    NEXT_PUBLIC_MICROSOFT_CLIENT_ID: null,
    NEXT_PUBLIC_MICROSOFT_TENANT_ID: null,
    NEXTAUTH_URL: 'http://localhost:3000'
  }
} as const

// Validation for required environment variables
export function validateEnvironment(): void {
  const missing = ENV_CONFIG.requiredEnvVars.filter(
    varName => !process.env[varName]
  )
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }
}

// Type exports
export type ProcessingStatus = typeof APP_CONFIG.PROCESSING_STATUS[keyof typeof APP_CONFIG.PROCESSING_STATUS]
export type FreshdeskStatusCode = keyof typeof APP_CONFIG.FRESHDESK_STATUS_CODES
