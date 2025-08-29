import { Database } from './database.types'
import { ProcessingStatus } from './config'

// Database types
export type RMATicket = Database['public']['Tables']['rma_tickets']['Row']
export type RMATicketInsert = Database['public']['Tables']['rma_tickets']['Insert']
export type RMATicketUpdate = Database['public']['Tables']['rma_tickets']['Update']

// Freshdesk types
export interface FreshdeskTicket {
  id: number
  subject: string
  description: string
  description_text?: string
  status: number
  priority: number
  type?: string
  source: number
  created_at: string
  updated_at: string
  due_by?: string
  fr_due_by?: string
  is_escalated: boolean
  requester?: {
    id: number
    name: string
    email: string
  }
  requester_id?: number
  responder_id?: number
  company_id?: number
  group_id?: number
  product_id?: number
  custom_fields?: Record<string, any>
  tags?: string[]
  cc_emails?: string[]
  fwd_emails?: string[]
  reply_cc_emails?: string[]
  email_config_id?: number
  fr_escalated: boolean
  spam: boolean
  deleted: boolean
  conversations: FreshdeskConversation[]
}

export interface FreshdeskConversation {
  id: number
  body: string
  body_text?: string
  incoming: boolean
  private: boolean
  user_id?: number
  support_email?: string
  source: number
  category: number
  to_emails?: string[]
  from_email?: string
  cc_emails?: string[]
  bcc_emails?: string[]
  email_failure_count?: number
  outgoing_failures?: any[]
  thread_id?: number
  thread_message_id?: number
  created_at: string
  updated_at: string
  attachments?: FreshdeskAttachment[]
}

export interface FreshdeskAttachment {
  id: number
  content_type: string
  size: number
  name: string
  attachment_url: string
  created_at: string
  updated_at: string
}

// OpenAI Analysis types
export interface ReasonAnalysis {
  primaryReason: string
  specificIssue: string
  customerImpact: string
  timeline: string
  additionalNotes: string
}

// Teams search types
export interface TeamsSearchResult {
  searchPerformed: boolean
  deviceId: string
  chatsSearched?: number
  totalChats?: number
  matchingChats?: number
  totalMessages?: number
  results?: TeamsChat[]
  summary?: string
  error?: string
  details?: string
}

export interface TeamsChat {
  chatId: string
  chatTopic: string
  chatType: 'oneOnOne' | 'group' | 'channel'
  messagesFound: number
  messages: TeamsMessage[]
}

export interface TeamsMessage {
  id: string
  from: string
  fromEmail: string
  content: string
  createdDateTime: string
  messageType: string
}

// Service interfaces
export interface IFreshdeskService {
  getTicket(rmaNumber: string): Promise<FreshdeskTicket | null>
  extractDeviceIds(ticket: FreshdeskTicket): string[]
  extractTeamsSearchTerms(deviceIds: string[]): string[]
  buildTicketText(ticket: FreshdeskTicket): string
  mapStatusCode(statusCode: number): string
}

export interface IOpenAIService {
  analyzeTicketForReason(ticketText: string): Promise<ReasonAnalysis>
}

export interface ITeamsService {
  searchMultipleDeviceIds(deviceIds: string[]): Promise<TeamsSearchResult[]>
}

// RMA Processor interface
export interface IRMAProcessor {
  processRMATicket(rmaNumber: string, userAccessToken?: string): Promise<RMATicket>
  getRMATickets(limit?: number, offset?: number): Promise<RMATicket[]>
  getRMATicket(rmaNumber: string): Promise<RMATicket | null>
  deleteRMATicket(rmaNumber: string): Promise<void>
}

// Form and UI types
export interface RMAFormData {
  rmaNumber: string
  teamsAccessToken?: string
}

export interface PaginationInfo {
  limit: number
  offset: number
  count: number
  hasMore: boolean
}

// API Response types
export interface APIResponse<T = any> {
  success?: boolean
  data?: T
  error?: string
  details?: string
  message?: string
}

export interface RMATicketResponse extends APIResponse {
  ticket?: RMATicket
}

export interface RMATicketsResponse extends APIResponse {
  tickets?: RMATicket[]
  pagination?: PaginationInfo
}

// Processing result types
export interface ProcessingResult {
  ticket: RMATicket
  deviceIds: string[]
  teamsSearchResults?: TeamsSearchResult[]
  reasonAnalysis: ReasonAnalysis
  processingTime: number
}

// Error types
export interface ServiceError extends Error {
  service: string
  code?: string
  statusCode?: number
}

// Configuration types
export interface ServiceConfig {
  timeout: number
  retries: number
  baseUrl?: string
  apiKey?: string
}

export interface AppConfig {
  freshdesk: ServiceConfig
  openai: ServiceConfig
  teams: ServiceConfig
  database: {
    maxConnections: number
    timeout: number
  }
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
