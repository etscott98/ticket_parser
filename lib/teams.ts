import { Client } from '@microsoft/microsoft-graph-client'
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client'

interface TeamsSearchResult {
  messageId: string
  chatId?: string
  channelId?: string
  teamId?: string
  from: {
    user?: {
      displayName?: string
      email?: string
    }
  }
  createdDateTime: string
  body: {
    content: string
    contentType: string
  }
  webUrl?: string
  relevanceScore?: number
}

interface TeamsAnalysis {
  deviceId: string
  searchPerformed: boolean
  messagesFound: number
  messages: TeamsSearchResult[]
  summary: string
  error?: string
}

export class TeamsService {
  private graphClient: Client | null = null

  constructor() {
    // Check if Microsoft credentials are available
    const clientId = process.env.MICROSOFT_CLIENT_ID
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
    const tenantId = process.env.MICROSOFT_TENANT_ID

    if (!clientId || !clientSecret || !tenantId) {
      console.log('ℹ️ Microsoft Teams credentials not configured - Teams search will be skipped')
      return
    }
  }

  private isConfigured(): boolean {
    return !!(process.env.MICROSOFT_CLIENT_ID && 
              process.env.MICROSOFT_CLIENT_SECRET && 
              process.env.MICROSOFT_TENANT_ID)
  }

  private async getAccessToken(): Promise<string> {
    // For now, we'll implement a simplified approach that works with your permissions
    // This is a placeholder - in production, you'd need a proper auth flow
    
    const clientId = process.env.MICROSOFT_CLIENT_ID!
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
    const tenantId = process.env.MICROSOFT_TENANT_ID!

    try {
      // Use client credentials flow with your available permissions
      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
      
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString()
      })

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.access_token
    } catch (error) {
      console.error('Error acquiring access token:', error)
      throw new Error('Microsoft Teams authentication failed')
    }
  }

  private async getGraphClient(): Promise<Client> {
    if (!this.graphClient) {
      const accessToken = await this.getAccessToken()
      
      this.graphClient = Client.init({
        authProvider: (done) => {
          done(null, accessToken)
        }
      })
    }
    return this.graphClient
  }

  async searchForDeviceId(deviceId: string): Promise<TeamsAnalysis> {
    console.log(`🔍 Searching Teams for device ID: ${deviceId}`)

    // Check if Teams integration is configured
    if (!this.isConfigured()) {
      return {
        deviceId,
        searchPerformed: false,
        messagesFound: 0,
        messages: [],
        summary: 'Microsoft Teams credentials not configured - search skipped'
      }
    }

    try {
      // Validate device ID format (10 digits starting with 5A00)
      if (!deviceId || !deviceId.match(/^5A00\d{6}$/)) {
        return {
          deviceId,
          searchPerformed: false,
          messagesFound: 0,
          messages: [],
          summary: 'Device ID does not match 5A00 format - Teams search skipped'
        }
      }

      const graphClient = await this.getGraphClient()

      console.log(`📡 Executing Teams search for: ${deviceId}`)
      
      // Try different approaches based on available permissions
      let messages: TeamsSearchResult[] = []
      
      try {
        // First try: Search API (if available)
        const searchRequest = {
          requests: [{
            entityTypes: ['message'],
            query: {
              queryString: deviceId
            },
            from: 0,
            size: 25
          }]
        }

        const searchResponse = await graphClient
          .api('/search/query')
          .post(searchRequest)

        const searchResults = searchResponse?.value?.[0]?.hitsContainers?.[0]?.hits || []
        
        messages = searchResults.map((hit: any) => ({
          messageId: hit.resource.id,
          chatId: hit.resource.chatId,
          channelId: hit.resource.channelIdentity?.channelId,
          teamId: hit.resource.channelIdentity?.teamId,
          from: {
            user: {
              displayName: hit.resource.from?.user?.displayName,
              email: hit.resource.from?.user?.email
            }
          },
          createdDateTime: hit.resource.createdDateTime,
          body: {
            content: hit.resource.body?.content || '',
            contentType: hit.resource.body?.contentType || 'text'
          },
          webUrl: hit.resource.webUrl,
          relevanceScore: hit.score
        }))

      } catch (searchError) {
        console.log(`⚠️ Teams search API not available with current permissions: ${searchError}`)
        
        // Fallback: Try to access user's chats (with chat.read permission)
        try {
          const chatsResponse = await graphClient
            .api('/me/chats')
            .get()

          // This is a limited fallback - we can't search content with current permissions
          console.log(`📊 Found ${chatsResponse.value?.length || 0} accessible chats (content search not available with current permissions)`)
          
          return {
            deviceId,
            searchPerformed: true,
            messagesFound: 0,
            messages: [],
            summary: `Teams integration attempted but limited by permissions. Found ${chatsResponse.value?.length || 0} accessible chats, but cannot search message content with current permissions (chat.read, user.read). For full functionality, need Chat.Read.All and ChannelMessage.Read.All application permissions.`
          }

        } catch (chatError) {
          throw new Error(`Cannot access Teams data with current permissions: ${chatError}`)
        }
      }
      
      console.log(`📊 Found ${messages.length} Teams messages`)

      // Generate summary
      const summary = this.generateTeamsSummary(deviceId, messages)

      return {
        deviceId,
        searchPerformed: true,
        messagesFound: messages.length,
        messages,
        summary
      }

    } catch (error) {
      console.error('Teams search error:', error)
      
      return {
        deviceId,
        searchPerformed: false,
        messagesFound: 0,
        messages: [],
        summary: `Teams search failed: ${error instanceof Error ? error.message : 'Unknown error'}. Current permissions (chat.read, user.read) may be insufficient for comprehensive search.`,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private generateTeamsSummary(deviceId: string, messages: TeamsSearchResult[]): string {
    if (messages.length === 0) {
      return `No Teams messages found for device ${deviceId}`
    }

    const summary = []
    summary.push(`Found ${messages.length} Teams message(s) mentioning device ${deviceId}:`)

    // Group by users
    const userMessages = new Map<string, number>()
    messages.forEach(msg => {
      const user = msg.from.user?.displayName || 'Unknown User'
      userMessages.set(user, (userMessages.get(user) || 0) + 1)
    })

    // Recent activity
    const recentMessages = messages
      .sort((a, b) => new Date(b.createdDateTime).getTime() - new Date(a.createdDateTime).getTime())
      .slice(0, 3)

    summary.push(`\nRecent activity:`)
    recentMessages.forEach((msg, i) => {
      const date = new Date(msg.createdDateTime).toLocaleDateString()
      const user = msg.from.user?.displayName || 'Unknown'
      const preview = this.extractTextFromHtml(msg.body.content)
        .substring(0, 100)
        .replace(/\n/g, ' ')
      summary.push(`${i + 1}. ${date} - ${user}: ${preview}...`)
    })

    // User summary
    if (userMessages.size > 0) {
      summary.push(`\nUsers involved: ${Array.from(userMessages.keys()).join(', ')}`)
    }

    return summary.join('\n')
  }

  private extractTextFromHtml(html: string): string {
    if (!html) return ''
    
    // Basic HTML tag removal (for more complex HTML, consider using a proper HTML parser)
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&')  // Replace &amp; with &
      .replace(/&lt;/g, '<')   // Replace &lt; with <
      .replace(/&gt;/g, '>')   // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .trim()
  }

  async searchMultipleDeviceIds(deviceIds: string[]): Promise<TeamsAnalysis[]> {
    const fiveADeviceIds = deviceIds.filter(id => id.match(/^5A00\d{6}$/))
    
    if (fiveADeviceIds.length === 0) {
      return [{
        deviceId: 'N/A',
        searchPerformed: false,
        messagesFound: 0,
        messages: [],
        summary: 'No 5A00 device IDs found to search in Teams'
      }]
    }

    console.log(`🔍 Searching Teams for ${fiveADeviceIds.length} device IDs: ${fiveADeviceIds.join(', ')}`)

    // Search for each device ID
    const searches = fiveADeviceIds.map(deviceId => this.searchForDeviceId(deviceId))
    
    // Wait for all searches to complete
    const results = await Promise.all(searches)
    
    return results
  }
}
