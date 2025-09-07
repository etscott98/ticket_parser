// Service Interfaces
export interface IFreshdeskService {
  getTicket(ticketId: string): Promise<any>
  extractDeviceIds(ticket: any): string[]
  buildTicketText(ticket: any): string
  mapStatusCode(statusCode: number): string
}

export interface IOpenAIService {
  analyzeTicketForReason(ticketText: string): Promise<ReasonAnalysis>
}

export interface ITeamsService {
  searchForDeviceId(deviceId: string, accessToken?: string): Promise<TeamsAnalysis>
  searchMultipleDeviceIds(deviceIds: string[], accessToken?: string): Promise<TeamsAnalysis[]>
}

export interface ISupabaseService {
  query<T>(table: string): any
  from(table: string): any
}

// Data Models
export interface ReasonAnalysis {
  primaryReason: string
  specificIssue?: string
  customerImpact?: string
  additionalNotes?: string
}

export interface TeamsAnalysis {
  deviceId: string
  messageCount: number
  messages: TeamsSearchResult[]
  summary: string
}

export interface TeamsSearchResult {
  messageId: string
  chatId?: string
  channelId?: string
  teamId?: string
  chatName?: string
  channelName?: string
  from?: {
    user?: {
      displayName?: string
      email?: string
    }
  }
  createdDateTime: string
  body?: {
    content?: string
    contentType?: string
  }
  webUrl?: string
  relevanceScore?: number
}

// Configuration
export interface AppConfiguration {
  readonly SUPABASE_TABLE_NAME: string
  readonly PROCESSING_STATUS: {
    readonly PENDING: string
    readonly PROCESSING: string
    readonly COMPLETED: string
    readonly FAILED: string
  }
  readonly FRESHDESK_STATUS_CODES: Record<number, string>
  readonly DEVICE_ID_PATTERNS: Record<string, RegExp>
  readonly TIMEOUTS: {
    readonly RMA_PROCESSING: number
    readonly TEAMS_SEARCH: number
    readonly FRESHDESK_API: number
    readonly OPENAI_API: number
  }
  readonly LIMITS: {
    readonly MAX_DEVICE_IDS: number
    readonly MAX_TEAMS_SEARCH_TERMS: number
    readonly MAX_CHAT_MESSAGES_PER_SEARCH: number
    readonly MAX_CHATS_TO_SEARCH: number
  }
}

// Logger Interface
export interface ILogger {
  info(message: string, data?: any): void
  error(message: string, error?: any): void
  warn(message: string, data?: any): void
  debug(message: string, data?: any): void
}
