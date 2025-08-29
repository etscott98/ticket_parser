import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@microsoft/microsoft-graph-client'

export async function POST(request: NextRequest) {
  try {
    const { deviceId, accessToken } = await request.json()

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 401 }
      )
    }

    // Validate device ID format (10 digits starting with 5A00)
    if (!deviceId.match(/^5A00\d{6}$/)) {
      return NextResponse.json({
        searchPerformed: false,
        deviceId,
        message: 'Device ID does not match 5A00 format - Teams search skipped',
        results: []
      })
    }

    console.log(`🔍 Searching Teams for device ID: ${deviceId}`)

    // Initialize Graph client with user's access token
    const graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken)
      }
    })

    // Search user's chats
    const chats = await graphClient.api('/me/chats').get()
    
    const results: any[] = []
    let totalChatsSearched = 0
    
    // Search through chats for the device ID (limit to avoid timeout)
    const chatsToSearch = chats.value.slice(0, 20) // Limit to 20 most recent chats
    
    for (const chat of chatsToSearch) {
      try {
        totalChatsSearched++
        
        // Get messages from this chat
        const messages = await graphClient
          .api(`/me/chats/${chat.id}/messages`)
          .top(100) // Get last 100 messages from each chat
          .get()

        // Search message content for device ID
        const matchingMessages = messages.value.filter((message: any) => {
          const content = message.body?.content || ''
          const plainContent = content.replace(/<[^>]*>/g, '') // Remove HTML tags
          return plainContent.toLowerCase().includes(deviceId.toLowerCase())
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

    const totalMessages = results.reduce((sum, chat) => sum + chat.messagesFound, 0)

    console.log(`📊 Searched ${totalChatsSearched} chats, found ${totalMessages} messages mentioning ${deviceId}`)

    return NextResponse.json({
      searchPerformed: true,
      deviceId,
      chatsSearched: totalChatsSearched,
      totalChats: chats.value.length,
      matchingChats: results.length,
      totalMessages,
      results,
      summary: generateSearchSummary(deviceId, results, totalChatsSearched, chats.value.length)
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
