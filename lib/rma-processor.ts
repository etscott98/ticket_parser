import { supabaseAdmin } from './supabase'
import { FreshdeskService } from './freshdesk'
import { OpenAIService } from './openai'
import { TeamsService } from './teams'
import { 
  RMATicket, 
  RMATicketInsert, 
  RMATicketUpdate, 
  IRMAProcessor,
  ProcessingResult,
  TeamsSearchResult
} from './types'
import { APP_CONFIG, ProcessingStatus } from './config'
import { createLogger, NotFoundError, ExternalServiceError } from './errors'

export class RMAProcessor implements IRMAProcessor {
  private readonly logger = createLogger('RMAProcessor')
  private readonly freshdesk: FreshdeskService
  private readonly openai: OpenAIService
  private readonly teams: TeamsService

  constructor() {
    this.freshdesk = new FreshdeskService()
    this.openai = new OpenAIService()
    this.teams = new TeamsService()
  }

  async processRMATicket(rmaNumber: string, userAccessToken?: string): Promise<RMATicket> {
    const startTime = Date.now()
    this.logger.info('Starting RMA processing', { rmaNumber })

    try {
      // Check if ticket already exists
      const existingTicket = await this.checkExistingTicket(rmaNumber)
      if (existingTicket?.processing_status === APP_CONFIG.PROCESSING_STATUS.COMPLETED) {
        this.logger.info('RMA already processed', { rmaNumber })
        return existingTicket
      }

      // Create processing record
      const ticket = await this.createProcessingRecord(rmaNumber)

      // Step 1: Fetch from Freshdesk
      this.logger.info('Fetching Freshdesk ticket', { rmaNumber })
      const freshdeskTicket = await this.freshdesk.getTicket(rmaNumber)

      if (!freshdeskTicket) {
        return await this.updateTicketAsNotFound(ticket.id!, rmaNumber)
      }

      this.logger.info('Freshdesk ticket found', { rmaNumber })

      // Step 2: Extract data
      this.logger.info('Extracting ticket data', { rmaNumber })
      
      const ticketDate = new Date(freshdeskTicket.created_at).toISOString()
      const deviceIds = this.freshdesk.extractDeviceIds(freshdeskTicket)
      const vidsAssociated = deviceIds.length > 0 ? deviceIds.join(', ') : null
      const customerInformation = this.formatCustomerInformation(freshdeskTicket.requester)
      const status = this.freshdesk.mapStatusCode(freshdeskTicket.status)

      this.logger.info('Data extracted', { 
        rmaNumber, 
        deviceIdCount: deviceIds.length,
        customer: customerInformation 
      })

      // Step 3: AI Analysis
      this.logger.info('Starting AI analysis', { rmaNumber })
      const ticketText = this.freshdesk.buildTicketText(freshdeskTicket)
      const reasonAnalysis = await this.openai.analyzeTicketForReason(ticketText)

      this.logger.info('AI analysis complete', { 
        rmaNumber, 
        primaryReason: reasonAnalysis.primaryReason 
      })

      // Step 4: Teams Search
      const { results: teamsSearchResults, summary: teamsSummary } = 
        await this.performTeamsSearch(deviceIds, userAccessToken)

      // Step 5: Save to database
      const updateData: RMATicketUpdate = {
        processing_status: APP_CONFIG.PROCESSING_STATUS.COMPLETED,
        ticket_date: ticketDate,
        customer_name: freshdeskTicket.requester?.name || null,
        customer_email: freshdeskTicket.requester?.email || null,
        customer_information: customerInformation,
        status: status,
        freshdesk_status_code: freshdeskTicket.status,
        vids_associated: vidsAssociated,
        primary_reason: reasonAnalysis.primaryReason,
        specific_issue: reasonAnalysis.specificIssue,
        customer_impact: reasonAnalysis.customerImpact,
        timeline: reasonAnalysis.timeline,
        additional_notes: reasonAnalysis.additionalNotes,
        raw_ticket_data: freshdeskTicket,
        teams_search_results: teamsSearchResults,
        teams_summary: teamsSummary,
        error_message: null,
        updated_at: new Date().toISOString()
      }

      const { data: finalTicket, error: updateError } = await supabaseAdmin
        .from(APP_CONFIG.SUPABASE_TABLE_NAME)
        .update(updateData)
        .eq('id', ticket.id)
        .select()
        .single()

      if (updateError) {
        throw new ExternalServiceError('Supabase', `Failed to save processed data: ${updateError.message}`)
      }

      const processingTime = Date.now() - startTime
      this.logger.info('RMA processed successfully', { 
        rmaNumber, 
        processingTime: `${processingTime}ms` 
      })
      
      return finalTicket!

    } catch (error) {
      this.logger.error('RMA processing failed', { rmaNumber, error })
      
      // Create processing record if it doesn't exist
      const existingTicket = await this.checkExistingTicket(rmaNumber)
      if (existingTicket?.id) {
        await this.updateTicketAsFailed(existingTicket.id, error as Error)
      }

      throw error
    }
  }

  async getRMATickets(limit = 50, offset = 0): Promise<RMATicket[]> {
    const { data, error } = await supabaseAdmin
      .from('rma_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to fetch RMA tickets: ${error.message}`)
    }

    return data || []
  }

  async getRMATicket(rmaNumber: string): Promise<RMATicket | null> {
    const { data, error } = await supabaseAdmin
      .from('rma_tickets')
      .select('*')
      .eq('rma_number', rmaNumber)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to fetch RMA ticket: ${error.message}`)
    }

    return data
  }

  async deleteRMATicket(rmaNumber: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('rma_tickets')
      .delete()
      .eq('rma_number', rmaNumber)

    if (error) {
      throw new Error(`Failed to delete RMA ticket: ${error.message}`)
    }
  }

  // Helper methods
  private async checkExistingTicket(rmaNumber: string): Promise<RMATicket | null> {
    const { data, error } = await supabaseAdmin
      .from(APP_CONFIG.SUPABASE_TABLE_NAME)
      .select('*')
      .eq('rma_number', rmaNumber)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new ExternalServiceError('Supabase', error.message)
    }

    return data
  }

  private async createProcessingRecord(rmaNumber: string): Promise<RMATicket> {
    const ticketData: RMATicketInsert = {
      rma_number: rmaNumber,
      processing_status: APP_CONFIG.PROCESSING_STATUS.PROCESSING,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from(APP_CONFIG.SUPABASE_TABLE_NAME)
      .upsert(ticketData, { 
        onConflict: 'rma_number',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) {
      throw new ExternalServiceError('Supabase', `Failed to create processing record: ${error.message}`)
    }

    return data!
  }

  private async updateTicketAsNotFound(ticketId: string, rmaNumber: string): Promise<RMATicket> {
    const updateData: RMATicketUpdate = {
      processing_status: APP_CONFIG.PROCESSING_STATUS.COMPLETED,
      status: 'Not found',
      error_message: 'Ticket not found in Freshdesk',
      ticket_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from(APP_CONFIG.SUPABASE_TABLE_NAME)
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single()

    if (error) {
      throw new ExternalServiceError('Supabase', error.message)
    }

    this.logger.info('RMA marked as not found', { rmaNumber })
    return data!
  }

  private async updateTicketAsFailed(ticketId: string, error: Error): Promise<void> {
    const errorData: RMATicketUpdate = {
      processing_status: APP_CONFIG.PROCESSING_STATUS.FAILED,
      error_message: error.message,
      updated_at: new Date().toISOString()
    }

    await supabaseAdmin
      .from(APP_CONFIG.SUPABASE_TABLE_NAME)
      .update(errorData)
      .eq('id', ticketId)
  }

  private formatCustomerInformation(requester?: { name: string; email: string }): string | null {
    if (!requester) return null
    
    const { name, email } = requester
    if (name && email) return `${name} <${email}>`
    if (name) return name
    if (email) return `<${email}>`
    return null
  }

  private async performTeamsSearch(
    deviceIds: string[], 
    userAccessToken?: string
  ): Promise<{ results: TeamsSearchResult[] | null; summary: string | null }> {
    const teamsSearchTerms = this.freshdesk.extractTeamsSearchTerms(deviceIds)
    
    if (teamsSearchTerms.length === 0) {
      return {
        results: null,
        summary: 'No VIDs found to search in Teams'
      }
    }

    this.logger.info('Starting Teams search', { 
      searchTermsCount: teamsSearchTerms.length,
      hasUserToken: !!userAccessToken 
    })

    if (userAccessToken) {
      return await this.performUserTeamsSearch(teamsSearchTerms, userAccessToken)
    } else {
      return await this.performServiceTeamsSearch(teamsSearchTerms)
    }
  }

  private async performUserTeamsSearch(
    searchTerms: string[], 
    accessToken: string
  ): Promise<{ results: TeamsSearchResult[] | null; summary: string | null }> {
    try {
      const searchPromises = searchTerms.map(async (searchTerm) => {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/teams/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: searchTerm, accessToken }),
          signal: AbortSignal.timeout(APP_CONFIG.TEAMS_SEARCH_TIMEOUT)
        })
        
        if (response.ok) {
          return await response.json()
        } else {
          this.logger.error('Teams search failed', { searchTerm, status: response.statusText })
          return {
            searchPerformed: false,
            deviceId: searchTerm,
            message: 'Teams search failed',
            results: []
          }
        }
      })
      
      const results = await Promise.all(searchPromises)
      
      if (results.some(r => r.results?.length > 0)) {
        const totalMessages = results.reduce((sum, r) => sum + (r.totalMessages || 0), 0)
        return {
          results,
          summary: `Teams search performed with user authentication. Found ${totalMessages} message(s) across ${results.filter(r => r.results?.length > 0).length} chat(s) for VIDs: ${searchTerms.join(', ')}`
        }
      } else {
        return {
          results: null,
          summary: `Teams search performed with user authentication but no messages found for search terms: ${searchTerms.join(', ')}`
        }
      }
    } catch (error) {
      this.logger.error('User Teams search failed', error)
      return {
        results: null,
        summary: `Teams search attempted but failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async performServiceTeamsSearch(
    searchTerms: string[]
  ): Promise<{ results: TeamsSearchResult[] | null; summary: string | null }> {
    this.logger.info('Using service authentication for Teams search')
    
    const teamsResults = await this.teams.searchMultipleDeviceIds(searchTerms)
    
    if (teamsResults.length > 0) {
      const totalMessages = teamsResults.reduce((sum, r) => sum + (r.totalMessages || 0), 0)
      return {
        results: teamsResults,
        summary: teamsResults.map(r => r.summary).join('\n\n---\n\n')
      }
    } else {
      return {
        results: null,
        summary: null
      }
    }
  }
}
