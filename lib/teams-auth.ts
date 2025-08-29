'use client'

import { PublicClientApplication, Configuration, AuthenticationResult } from '@azure/msal-browser'
import { Client } from '@microsoft/microsoft-graph-client'

interface TeamsAuthConfig {
  clientId: string
  tenantId: string
  redirectUri: string
}

interface UserInfo {
  displayName: string
  email: string
  id: string
}

export class TeamsAuthService {
  private msalInstance: PublicClientApplication | null = null
  private graphClient: Client | null = null
  private currentUser: UserInfo | null = null

  constructor(config: TeamsAuthConfig) {
    if (typeof window !== 'undefined') {
      const msalConfig: Configuration = {
        auth: {
          clientId: config.clientId,
          authority: `https://login.microsoftonline.com/${config.tenantId}`,
          redirectUri: config.redirectUri
        },
        cache: {
          cacheLocation: 'localStorage',
          storeAuthStateInCookie: false
        }
      }

      this.msalInstance = new PublicClientApplication(msalConfig)
    }
  }

  async initialize(): Promise<void> {
    if (!this.msalInstance) return
    
    try {
      await this.msalInstance.initialize()
      
      // Handle redirect response first (in case user was redirected back from auth)
      try {
        const response = await this.msalInstance.handleRedirectPromise()
        if (response) {
          console.log('Handled redirect response:', response)
          await this.setupGraphClient(response.accessToken)
          
          // Get user info from the response
          if (response.account) {
            this.currentUser = {
              displayName: response.account.name || 'Unknown',
              email: response.account.username || '',
              id: response.account.localAccountId || ''
            }
          }
          return
        }
      } catch (error) {
        console.error('Error handling redirect:', error)
      }
      
      // Check if user is already signed in
      const accounts = this.msalInstance.getAllAccounts()
      if (accounts.length > 0) {
        // Try to get a token silently
        try {
          const silentRequest = {
            scopes: ['https://graph.microsoft.com/Chat.Read', 'https://graph.microsoft.com/User.Read'],
            account: accounts[0]
          }
          
          const response = await this.msalInstance.acquireTokenSilent(silentRequest)
          await this.setupGraphClient(response.accessToken)
          
          // Get user info
          this.currentUser = {
            displayName: accounts[0].name || 'Unknown',
            email: accounts[0].username || '',
            id: accounts[0].localAccountId || ''
          }
        } catch (error) {
          console.log('Silent token acquisition failed, user needs to sign in again')
        }
      }
    } catch (error) {
      console.error('MSAL initialization failed:', error)
    }
  }

  async signIn(): Promise<UserInfo | null> {
    if (!this.msalInstance) {
      throw new Error('MSAL not initialized')
    }

    try {
      const loginRequest = {
        scopes: ['https://graph.microsoft.com/Chat.Read', 'https://graph.microsoft.com/User.Read'],
        prompt: 'select_account'
      }

      console.log('Starting sign-in process...')
      
      // Try popup first, fallback to redirect if popup is blocked
      try {
        const response = await this.msalInstance.loginPopup(loginRequest)
        
        console.log('Popup sign-in successful:', response)
        
        if (response && response.accessToken) {
          await this.setupGraphClient(response.accessToken)
          
          // Get user information from the response account
          if (response.account) {
            this.currentUser = {
              displayName: response.account.name || 'Unknown',
              email: response.account.username || '',
              id: response.account.localAccountId || ''
            }
            return this.currentUser
          }
        }
        
        return null
      } catch (popupError: any) {
        console.log('Popup blocked or failed, trying redirect...', popupError)
        
        // If popup is blocked, use redirect flow
        if (popupError.name === 'BrowserAuthError' && popupError.errorCode === 'popup_window_error') {
          await this.msalInstance.loginRedirect(loginRequest)
          // The page will redirect and handle the response in initialize()
          return null
        } else {
          throw popupError
        }
      }
    } catch (error) {
      console.error('Sign in failed:', error)
      throw error
    }
  }

  async signOut(): Promise<void> {
    if (!this.msalInstance) return

    try {
      const accounts = this.msalInstance.getAllAccounts()
      if (accounts.length > 0) {
        await this.msalInstance.logoutPopup({
          account: accounts[0]
        })
      }
      
      this.graphClient = null
      this.currentUser = null
    } catch (error) {
      console.error('Sign out failed:', error)
      throw error
    }
  }

  private async setupGraphClient(accessToken: string): Promise<void> {
    this.graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken)
      }
    })
  }

  private async getUserInfo(): Promise<UserInfo> {
    if (!this.graphClient) {
      throw new Error('Graph client not initialized')
    }

    try {
      const user = await this.graphClient.api('/me').get()
      
      return {
        displayName: user.displayName || 'Unknown User',
        email: user.mail || user.userPrincipalName || '',
        id: user.id || ''
      }
    } catch (error) {
      console.error('Failed to get user info:', error)
      throw error
    }
  }

  async searchTeamsForDevice(deviceId: string): Promise<any> {
    if (!this.graphClient) {
      throw new Error('User not signed in')
    }

    try {
      // Search in user's chats
      const chats = await this.graphClient.api('/me/chats').get()
      
      const results: any[] = []
      
      // Search through recent chats for the device ID
      for (const chat of chats.value.slice(0, 10)) { // Limit to 10 most recent chats
        try {
          const messages = await this.graphClient
            .api(`/me/chats/${chat.id}/messages`)
            .top(50) // Get last 50 messages from each chat
            .get()

          // Search message content for device ID
          const matchingMessages = messages.value.filter((message: any) => {
            const content = message.body?.content || ''
            return content.includes(deviceId)
          })

          if (matchingMessages.length > 0) {
            results.push({
              chatId: chat.id,
              chatTopic: chat.topic || 'Direct Chat',
              messages: matchingMessages.map((msg: any) => ({
                id: msg.id,
                from: msg.from?.user?.displayName || 'Unknown',
                content: msg.body?.content || '',
                createdDateTime: msg.createdDateTime,
                messageType: msg.messageType
              }))
            })
          }
        } catch (error) {
          console.log(`Could not access messages in chat ${chat.id}:`, error)
          // Continue with other chats
        }
      }

      return {
        searchPerformed: true,
        deviceId,
        chatsSearched: Math.min(chats.value.length, 10),
        totalChats: chats.value.length,
        matchingChats: results.length,
        results
      }

    } catch (error) {
      console.error('Teams search failed:', error)
      throw error
    }
  }

  isSignedIn(): boolean {
    return !!this.currentUser && !!this.graphClient
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUser
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.msalInstance) return null

    try {
      const accounts = this.msalInstance.getAllAccounts()
      if (accounts.length === 0) return null

      const silentRequest = {
        scopes: ['https://graph.microsoft.com/Chat.Read', 'https://graph.microsoft.com/User.Read'],
        account: accounts[0]
      }

      const response = await this.msalInstance.acquireTokenSilent(silentRequest)
      return response.accessToken
    } catch (error) {
      console.error('Failed to get access token:', error)
      return null
    }
  }
}
