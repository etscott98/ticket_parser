import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@microsoft/microsoft-graph-client'
import { TeamsSearchRequestSchema } from '@/lib/schemas'
import { handleAPIError, createLogger, ExternalServiceError } from '@/lib/errors'

const logger = createLogger('Teams-Search-API')

export async function POST(request: NextRequest) {
  try {
    logger.info('Teams search request received')
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = TeamsSearchRequestSchema.parse(body)
    
    logger.info('Request validated', { deviceId: validatedData.deviceId })

    const { deviceId, accessToken } = validatedData
    
    logger.info('Starting Teams search', { deviceId })

    // Initialize Graph client with user's access token
    const graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken)
      }
    })

    // Search user's chats
    console.log(`🔍 Attempting to fetch user's chats...`)
    console.log(`🔍 Access token starts with: ${accessToken.substring(0, 20)}...`)
    
    // Decode JWT to see what scopes we actually have
    try {
      const tokenParts = accessToken.split('.')
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      console.log(`🔑 Token scopes: ${payload.scp || 'No scopes found'}`)
      console.log(`🔑 Token expires: ${new Date(payload.exp * 1000).toLocaleString()}`)
    } catch (e) {
      console.log(`🔑 Could not decode token scopes`)
    }
    
    let chats
    try {
      chats = await graphClient.api('/me/chats').get()
    } catch (chatsError) {
      console.error(`❌ Failed to fetch chats:`, chatsError)
      
      // Try alternative approach - check what permissions we have
      try {
        const me = await graphClient.api('/me').get()
        console.log(`✅ User info accessible: ${me.displayName} (${me.userPrincipalName})`)
      } catch (meError) {
        console.error(`❌ Cannot access user info:`, meError)
      }
      
      return NextResponse.json({
        searchPerformed: false,
        deviceId,
        error: 'Cannot access Teams chats - insufficient permissions',
        details: chatsError instanceof Error ? chatsError.message : 'Unknown error',
        results: []
      })
    }
    
    console.log(`📊 Total chats available: ${chats.value?.length || 0}`)
    console.log(`📋 Raw chats response:`, JSON.stringify(chats, null, 2).substring(0, 500))
    
    // Check what additional permissions might help
    console.log(`🔍 The main issue: Microsoft Graph /me/chats returns 0 chats even with Chat.ReadBasic`)
    console.log(`📋 This is common in enterprise environments - chat enumeration is often restricted`)
    console.log(`💡 Possible solutions: ChatMessage.Read, ChatMessage.Read.All, or admin consent for broader permissions`)
    
    if (chats.value && chats.value.length > 0) {
      console.log(`📋 Chat types found:`, chats.value.map(c => c.chatType).slice(0, 5))
      console.log(`📋 Sample chat topics:`, chats.value.map(c => c.topic || 'No topic').slice(0, 3))
    } else {
      console.log(`⚠️ No personal chats found - this could mean:`)
      console.log(`   1. User genuinely has no Teams chats`)
      console.log(`   2. Permission limitation (ChatMessage.Read may not include chat enumeration)`)
      console.log(`   3. API scope issue`)
    }
    
    const results: any[] = []
    let totalChatsSearched = 0
    
    // Search through chats for the device ID (expand search scope)
    const chatsToSearch = chats.value?.slice(0, 50) || [] // Increase to 50 most recent chats
    
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    console.log(`📋 Searching ${chatsToSearch.length} personal chats for ${deviceId}`)
    console.log(`📅 Looking for messages from ${sixMonthsAgo.toDateString()} to today`)
    
    // Skip Teams channels - focus on private/group chats only
    console.log(`ℹ️ Skipping Teams channels - focusing on private and group chats only`)
    const teams = { value: [] }
    
    for (const chat of chatsToSearch) {
      try {
        totalChatsSearched++
        const chatName = chat.topic || getDirectChatName(chat)
        console.log(`🔍 Searching chat ${totalChatsSearched}/${chatsToSearch.length}: "${chatName}"...`)
        
        // Get messages from this chat (search back 6 months)
        const messages = await graphClient
          .api(`/me/chats/${chat.id}/messages`)
          .filter(`createdDateTime ge ${sixMonthsAgo.toISOString()}`)
          .top(500) // Increase to 500 messages per chat for wider coverage
          .orderby('createdDateTime desc')
          .get()

        // Search message content for device ID with multiple patterns
        const matchingMessages = messages.value.filter((message: any) => {
          const content = message.body?.content || ''
          const plainContent = content.replace(/<[^>]*>/g, '') // Remove HTML tags
          const searchText = plainContent.toLowerCase()
          const deviceIdLower = deviceId.toLowerCase()
          
          // Try multiple search patterns
          const patterns = [
            deviceIdLower,                          // Exact match: 5a0029f4ba
            deviceIdLower.replace(/(.{2})(.{4})(.{4})/, '$1 $2 $3'), // Spaced: 5a 0029 f4ba
            deviceIdLower.replace(/(.{2})(.{4})(.{4})/, '$1-$2-$3'), // Dashed: 5a-0029-f4ba
            deviceIdLower.replace(/(.{2})(.{4})(.{4})/, '$1.$2.$3'), // Dotted: 5a.0029.f4ba
            deviceIdLower.replace(/(.{4})(.{6})/, '$1$2'),           // No formatting
          ]
          
          // Check if any pattern matches
          const found = patterns.some(pattern => searchText.includes(pattern))
          
          if (found) {
            const messageDate = new Date(message.createdDateTime).toLocaleDateString()
            console.log(`🎯 Found VID match in message from ${messageDate}: "${plainContent.substring(0, 100)}..."`)
          }
          
          return found
        })

        if (matchingMessages.length > 0) {
          results.push({
            chatId: chat.id,
            chatTopic: chat.topic || getDirectChatName(chat),
            chatType: chat.chatType || 'oneOnOne',
            messagesFound: matchingMessages.length,
            messages: matchingMessages.slice(0, 5).map((msg: any) => ({ // Limit to 5 messages per chat
              id: msg.id,
              from: msg.from?.user?.displayName || 'Unknown User',
              fromEmail: msg.from?.user?.userPrincipalName || '',
              content: cleanMessageContent(msg.body?.content || ''),
              createdDateTime: msg.createdDateTime,
              messageType: msg.messageType || 'message'
            }))
          })
        }
      } catch (error) {
        console.log(`Could not access messages in chat ${chat.id}:`, error)
        // Continue with other chats
      }
    }

    // Now search Teams channels
    let totalChannelsSearched = 0
    for (const team of teams.value || []) {
      try {
        console.log(`🔍 Searching team: "${team.displayName}"...`)
        
        // Get channels for this team
        const channels = await graphClient.api(`/teams/${team.id}/channels`).get()
        
        for (const channel of channels.value || []) {
          try {
            totalChannelsSearched++
            console.log(`🔍 Searching channel: "${channel.displayName}" in team "${team.displayName}"...`)
            
            // Get messages from this channel
            const channelMessages = await graphClient
              .api(`/teams/${team.id}/channels/${channel.id}/messages`)
              .filter(`createdDateTime ge ${sixMonthsAgo.toISOString()}`)
              .top(200) // Limit per channel for performance
              .orderby('createdDateTime desc')
              .get()

            // Search channel messages
            const matchingChannelMessages = channelMessages.value?.filter((message: any) => {
              const content = message.body?.content || ''
              const plainContent = content.replace(/<[^>]*>/g, '')
              const searchText = plainContent.toLowerCase()
              const deviceIdLower = deviceId.toLowerCase()
              
              const patterns = [
                deviceIdLower,
                deviceIdLower.replace(/(.{2})(.{4})(.{4})/, '$1 $2 $3'),
                deviceIdLower.replace(/(.{2})(.{4})(.{4})/, '$1-$2-$3'),
                deviceIdLower.replace(/(.{2})(.{4})(.{4})/, '$1.$2.$3'),
              ]
              
              const found = patterns.some(pattern => searchText.includes(pattern))
              
              if (found) {
                const messageDate = new Date(message.createdDateTime).toLocaleDateString()
                console.log(`🎯 Found VID match in "${team.displayName}/${channel.displayName}" from ${messageDate}: "${plainContent.substring(0, 100)}..."`)
              }
              
              return found
            }) || []

            if (matchingChannelMessages.length > 0) {
              results.push({
                chatId: `${team.id}_${channel.id}`,
                chatTopic: `${team.displayName} / ${channel.displayName}`,
                chatType: 'channel',
                messagesFound: matchingChannelMessages.length,
                messages: matchingChannelMessages.slice(0, 5).map((msg: any) => ({
                  id: msg.id,
                  from: msg.from?.user?.displayName || 'Unknown User',
                  fromEmail: msg.from?.user?.userPrincipalName || '',
                  content: cleanMessageContent(msg.body?.content || ''),
                  createdDateTime: msg.createdDateTime,
                  messageType: msg.messageType || 'message'
                }))
              })
            }
          } catch (channelError) {
            console.log(`Could not access messages in channel ${channel.displayName}:`, channelError)
          }
        }
      } catch (teamError) {
        console.log(`Could not access team ${team.displayName}:`, teamError)
      }
    }

    const totalMessages = results.reduce((sum, chat) => sum + chat.messagesFound, 0)

    console.log(`📊 Searched ${totalChatsSearched} private/group chats, found ${totalMessages} messages mentioning ${deviceId}`)

    return NextResponse.json({
      searchPerformed: true,
      deviceId,
      chatsSearched: totalChatsSearched,
      totalChats: chats.value?.length || 0,
      matchingChats: results.length,
      totalMessages,
      results,
      summary: generateSearchSummary(deviceId, results, totalChatsSearched, chats.value?.length || 0)
    })

  } catch (error) {
    console.error('Teams search API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Teams search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        searchPerformed: false
      },
      { status: 500 }
    )
  }
}

function getDirectChatName(chat: any): string {
  // For direct chats, try to extract participant names
  if (chat.members && chat.members.length > 0) {
    const otherMembers = chat.members.filter((member: any) => 
      member.roles?.includes('owner') === false
    )
    if (otherMembers.length > 0) {
      return `Chat with ${otherMembers[0].displayName || 'Unknown'}`
    }
  }
  return 'Direct Chat'
}

function cleanMessageContent(content: string): string {
  if (!content) return ''
  
  // Remove HTML tags and clean up formatting
  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')  // Replace &amp; with &
    .replace(/&lt;/g, '<')   // Replace &lt; with <
    .replace(/&gt;/g, '>')   // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/\s+/g, ' ')    // Collapse multiple spaces
    .trim()
}

function generateSearchSummary(
  deviceId: string, 
  results: any[], 
  chatsSearched: number, 
  totalChats: number
): string {
  if (results.length === 0) {
    return `No Teams messages found for device ${deviceId}. Searched ${chatsSearched} of ${totalChats} accessible chats.`
  }

  const totalMessages = results.reduce((sum, chat) => sum + chat.messagesFound, 0)
  const chatList = results.slice(0, 3).map(chat => chat.chatTopic).join(', ')
  
  let summary = `Found ${totalMessages} message(s) mentioning device ${deviceId} across ${results.length} chat(s).\n\n`
  
  if (results.length <= 3) {
    summary += `Found in: ${chatList}`
  } else {
    summary += `Found in: ${chatList} and ${results.length - 3} other chat(s)`
  }
  
  // Add recent message preview
  const recentMessage = results[0]?.messages[0]
  if (recentMessage) {
    const preview = recentMessage.content.substring(0, 100)
    summary += `\n\nMost recent: "${preview}..." - ${recentMessage.from}`
  }
  
  summary += `\n\nSearched ${chatsSearched} of ${totalChats} accessible chats.`
  
  return summary
}
