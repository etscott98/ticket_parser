import { supabaseAdmin } from './supabase'
import { FreshdeskService } from './freshdesk'
import { OpenAIService } from './openai'
import { TeamsService } from './teams'
import { Database } from './database.types'

type RMATicket = Database['public']['Tables']['rma_tickets']['Row']
type RMATicketInsert = Database['public']['Tables']['rma_tickets']['Insert']
type RMATicketUpdate = Database['public']['Tables']['rma_tickets']['Update']

export class RMAProcessor {
  private freshdesk: FreshdeskService
  private openai: OpenAIService
  private teams: TeamsService

  constructor() {
    this.freshdesk = new FreshdeskService()
    this.openai = new OpenAIService()
    this.teams = new TeamsService()
  }

  async processRMATicket(rmaNumber: string, userAccessToken?: string): Promise<RMATicket> {
    console.log(`🔄 Processing RMA ${rmaNumber}...`)

    // Check if ticket already exists
    const { data: existingTicket } = await supabaseAdmin
      .from('rma_tickets')
      .select('*')
      .eq('rma_number', rmaNumber)
      .single()

    if (existingTicket && existingTicket.processing_status === 'completed') {
      console.log(`✅ RMA ${rmaNumber} already processed`)
      return existingTicket
    }

    // Create or update ticket record as processing
    const ticketData: RMATicketInsert = {
      rma_number: rmaNumber,
      processing_status: 'processing',
      updated_at: new Date().toISOString()
    }

    const { data: ticket, error: insertError } = await supabaseAdmin
      .from('rma_tickets')
      .upsert(ticketData, { 
        onConflict: 'rma_number',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create/update ticket record: ${insertError.message}`)
    }

    try {
      // Step 1: Fetch from Freshdesk
      console.log(`📞 Fetching Freshdesk ticket ${rmaNumber}...`)
      const freshdeskTicket = await this.freshdesk.getTicket(rmaNumber)

      if (!freshdeskTicket) {
        // Ticket not found
        const updateData: RMATicketUpdate = {
          processing_status: 'completed',
          status: 'Not found',
          error_message: 'Ticket not found in Freshdesk',
          ticket_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: updatedTicket, error } = await supabaseAdmin
          .from('rma_tickets')
          .update(updateData)
          .eq('id', ticket.id)
          .select()
          .single()

        if (error) throw new Error(`Failed to update ticket: ${error.message}`)
        
        console.log(`❌ RMA ${rmaNumber} not found in Freshdesk`)
        return updatedTicket
      }

      console.log(`✅ Freshdesk ticket found`)

      // Step 2: Extract data
      console.log(`🔍 Extracting ticket data...`)
      
      // Format date
      const ticketDate = new Date(freshdeskTicket.created_at).toISOString()
      
      // Extract device IDs
      const deviceIds = this.freshdesk.extractDeviceIds(freshdeskTicket)
      const vidsAssociated = deviceIds.length > 0 ? deviceIds.join(', ') : null

      // Customer information
      const customerName = freshdeskTicket.requester?.name || null
      const customerEmail = freshdeskTicket.requester?.email || null
      const customerInformation = customerName && customerEmail 
        ? `${customerName} <${customerEmail}>`
        : customerName || (customerEmail ? `<${customerEmail}>` : null)

      // Status
      const status = this.freshdesk.mapStatusCode(freshdeskTicket.status)

      console.log(`📊 Found ${deviceIds.length} device ID(s), customer: ${customerInformation}`)

      // Step 3: AI Analysis
      console.log(`🤖 Analyzing with AI...`)
      const ticketText = this.freshdesk.buildTicketText(freshdeskTicket)
      const reasonAnalysis = await this.openai.analyzeTicketForReason(ticketText)

      console.log(`✅ AI analysis complete: ${reasonAnalysis.primaryReason}`)

      // Step 4: Teams Search for all VIDs
      console.log(`🔍 Searching Teams for all VIDs...`)
      
      let teamsSearchResults = null
      let teamsSummary = null
      
      // Extract Teams search terms from all device IDs (use full VIDs)
      const teamsSearchTerms = this.freshdesk.extractTeamsSearchTerms(deviceIds)
      
      if (teamsSearchTerms.length > 0 && userAccessToken) {
        console.log(`📧 Using user authentication for Teams search`)
        
        try {
          // Use user's access token for enhanced search  
          console.log(`🔍 Found ${teamsSearchTerms.length} VID search terms: ${teamsSearchTerms.join(', ')}`)
          
          const searchPromises = teamsSearchTerms.map(async (searchTerm) => {
            const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/teams/search`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                deviceId: searchTerm, // Using full VID as search term
                accessToken: userAccessToken
              })
            })
            
            if (response.ok) {
              return await response.json()
            } else {
              console.error(`Teams search failed for ${searchTerm}:`, response.statusText)
              return {
                searchPerformed: false,
                deviceId: searchTerm,
                message: 'Teams search failed',
                results: []
              }
            }
          })
          
          const userTeamsResults = await Promise.all(searchPromises)
          
          if (userTeamsResults.some(r => r.results?.length > 0)) {
            teamsSearchResults = userTeamsResults
            teamsSummary = userTeamsResults.map(r => r.summary || r.message).join('\n\n---\n\n')
            
            const totalMessages = userTeamsResults.reduce((sum, r) => 
              sum + (r.totalMessages || 0), 0
            )
            console.log(`✅ Teams search complete: Found ${totalMessages} message(s) using user auth`)
          } else {
            teamsSummary = `Teams search performed with user authentication but no messages found for search terms: ${teamsSearchTerms.join(', ')}`
            console.log(`ℹ️ Teams search complete: No relevant messages found`)
          }
        } catch (error) {
          console.error('User Teams search failed:', error)
          teamsSummary = `Teams search attempted but failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      } else if (teamsSearchTerms.length > 0) {
        // Fallback to service search (limited permissions)
        console.log(`⚙️ Using service authentication for Teams search (limited)`)
        console.log(`🔍 Searching for VID terms: ${teamsSearchTerms.join(', ')}`)
        const teamsResults = await this.teams.searchMultipleDeviceIds(teamsSearchTerms)
        teamsSearchResults = teamsResults.length > 0 ? teamsResults : null
        teamsSummary = teamsResults.length > 0 
          ? teamsResults.map(r => r.summary).join('\n\n---\n\n')
          : null

        if (teamsSearchResults && teamsSearchResults.some(r => r.messagesFound > 0)) {
          const totalMessages = teamsSearchResults.reduce((sum, r) => sum + r.messagesFound, 0)
          console.log(`✅ Teams search complete: Found ${totalMessages} message(s)`)
        } else {
          console.log(`ℹ️ Teams search complete: No relevant messages found`)
        }
      } else {
        teamsSummary = `No VIDs found to search in Teams`
        console.log(`ℹ️ No VIDs found for Teams search`)
      }

      // Step 5: Save to database
      const updateData: RMATicketUpdate = {
        processing_status: 'completed',
        ticket_date: ticketDate,
        customer_name: customerName,
        customer_email: customerEmail,
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
        .from('rma_tickets')
        .update(updateData)
        .eq('id', ticket.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to save processed data: ${updateError.message}`)
      }

      console.log(`🎉 RMA ${rmaNumber} processed successfully`)
      return finalTicket

    } catch (error) {
      console.error(`❌ Error processing RMA ${rmaNumber}:`, error)

      // Mark as failed
      const errorData: RMATicketUpdate = {
        processing_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      }

      await supabaseAdmin
        .from('rma_tickets')
        .update(errorData)
        .eq('id', ticket.id)

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
}
