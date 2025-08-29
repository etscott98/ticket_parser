interface FreshdeskTicket {
  id: number
  subject: string
  description: string
  description_text: string
  status: number
  created_at: string
  custom_fields: Record<string, any>
  requester: {
    id: number
    name: string
    email: string
  }
  conversations: Array<{
    id: number
    body: string
    body_text: string
    created_at: string
    from_email: string
    private: boolean
  }>
}

export class FreshdeskService {
  private baseUrl: string
  private apiKey: string

  constructor() {
    const subdomain = process.env.FRESHDESK_SUBDOMAIN!
    this.baseUrl = `https://${subdomain}.freshdesk.com/api/v2`
    this.apiKey = process.env.FRESHDESK_API_KEY!
  }

  private getAuthHeader(): string {
    return 'Basic ' + Buffer.from(`${this.apiKey}:X`).toString('base64')
  }

  async getTicket(ticketId: string): Promise<FreshdeskTicket | null> {
    try {
      const url = `${this.baseUrl}/tickets/${ticketId}?include=conversations,requester`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        next: { revalidate: 0 } // Don't cache for fresh data
      })

      if (response.status === 404) {
        return null
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Freshdesk authentication failed. Check API key and subdomain.')
      }

      if (!response.ok) {
        throw new Error(`Freshdesk API error: ${response.status} - ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Freshdesk API error:', error)
      throw error
    }
  }

  extractDeviceIds(ticket: FreshdeskTicket): string[] {
    const deviceIds = new Set<string>()
    
    // Get text from ticket content
    const textSources = [
      ticket.subject,
      ticket.description_text || ticket.description,
      ...ticket.conversations.map(conv => conv.body_text || conv.body)
    ]

    // Pattern to match 10-digit device IDs
    const patterns = [
      /\b\d{10}\b/g,  // Exactly 10 digits with word boundaries
      /VID\s*(\d{10})/gi,  // VID prefix with 10 digits
      /ID\s*(\d{10})/gi,   // ID prefix with 10 digits
      /Serial\s*(?:Number|#|:)?\s*(\d{10})/gi,  // Serial number with 10 digits
      /Device\s*(?:ID|#|:)?\s*(\d{10})/gi,     // Device ID with 10 digits
      /(\d{4})[- ]?(\d{3})[- ]?(\d{3})/g,     // 10 digits with separators (4-3-3 format)
      /(\d{3})[- ]?(\d{3})[- ]?(\d{4})/g,     // 10 digits with separators (3-3-4 format)
    ]

    for (const text of textSources) {
      if (!text) continue
      
      for (const pattern of patterns) {
        const matches = text.matchAll(pattern)
        for (const match of matches) {
          let deviceId: string
          
          if (match[1]) {
            // Handle grouped matches (with separators)
            deviceId = match.slice(1).join('')
          } else {
            // Handle simple matches
            deviceId = match[0]
            // Remove VID/ID prefixes
            deviceId = deviceId.replace(/^(VID|ID|Serial|Device)\s*/i, '')
          }
          
          // Clean up and validate
          deviceId = deviceId.replace(/[^\d]/g, '') // Remove non-digits
          if (deviceId.length === 10 && /^\d+$/.test(deviceId)) {
            deviceIds.add(deviceId)
          }
        }
      }
    }

    // Also check custom field
    const vidsFieldKey = process.env.VIDS_FIELD_KEY || 'cf_vids_associated'
    const customVids = ticket.custom_fields[vidsFieldKey]
    if (customVids) {
      const customDeviceIds = String(customVids).match(/\b\d{10}\b/g)
      if (customDeviceIds) {
        customDeviceIds.forEach(id => deviceIds.add(id))
      }
    }

    return Array.from(deviceIds).sort()
  }

  buildTicketText(ticket: FreshdeskTicket): string {
    const parts: string[] = []
    
    if (ticket.subject?.trim()) {
      parts.push(`TICKET SUBJECT: ${ticket.subject}`)
    }
    
    const description = ticket.description_text || ticket.description
    if (description?.trim()) {
      parts.push(`INITIAL DESCRIPTION: ${description}`)
    }
    
    // Add ticket metadata
    const metadata: string[] = []
    if (ticket.status) metadata.push(`Status: ${ticket.status}`)
    
    if (metadata.length) {
      parts.push(`TICKET INFO: ${metadata.join(', ')}`)
    }
    
    // Process conversations (last 10 for relevance)
    if (ticket.conversations?.length) {
      const recentConversations = ticket.conversations.slice(-10)
      parts.push('CONVERSATION HISTORY:')
      
      recentConversations.forEach((conv, i) => {
        const body = conv.body_text || conv.body
        if (!body?.trim()) return
        
        // Clean up text
        let cleanBody = body.replace(/\n/g, ' ').replace(/\r/g, ' ')
        cleanBody = cleanBody.replace(/\s+/g, ' ').trim()
        
        // Truncate very long conversations
        if (cleanBody.length > 500) {
          cleanBody = cleanBody.substring(0, 500) + '...'
        }
        
        let convHeader = `Message ${i + 1}`
        if (conv.from_email) {
          convHeader += ` (from: ${conv.from_email})`
        }
        if (conv.private) {
          convHeader += ' [INTERNAL]'
        }
        
        parts.push(`${convHeader}: ${cleanBody}`)
      })
    }
    
    const text = parts.join('\n\n')
    
    // Truncate to 60k characters for AI safety
    if (text.length > 60000) {
      return text.substring(0, 60000)
    }
    
    return text
  }

  mapStatusCode(code: number): string {
    const statusMap: Record<number, string> = {
      2: 'Open',
      3: 'Pending', 
      4: 'Resolved',
      5: 'Closed'
    }
    return statusMap[code] || String(code)
  }
}
