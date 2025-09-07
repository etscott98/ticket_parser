'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, LogIn, LogOut, Shield, AlertCircle, Loader2 } from 'lucide-react'

interface TeamsSignInSafeProps {
  onAuthChange: (isAuthenticated: boolean, user: any, accessToken?: string) => void
}

interface AuthState {
  isSignedIn: boolean
  user: any
  isLoading: boolean
  error: string | null
  isInitialized: boolean
}

export function TeamsSignInSafe({ onAuthChange }: TeamsSignInSafeProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isSignedIn: false,
    user: null,
    isLoading: false,
    error: null,
    isInitialized: false
  })

  // Check if Teams credentials are configured
  const isConfigured = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID
    const tenantId = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID
    return !!(clientId && tenantId && clientId !== 'your_azure_app_client_id')
  }, [])

  // Initialize authentication service
  useEffect(() => {
    if (!isConfigured()) {
      setAuthState(prev => ({
        ...prev,
        error: 'Microsoft Teams credentials not configured',
        isInitialized: true
      }))
      return
    }

    // Simple initialization without complex MSAL setup
    setAuthState(prev => ({
      ...prev,
      isInitialized: true
    }))
  }, [isConfigured])

  const handleSignIn = async () => {
    if (!isConfigured()) {
      setAuthState(prev => ({
        ...prev,
        error: 'Teams credentials not configured'
      }))
      return
    }

    setAuthState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    try {
      // Use a simpler approach - open popup manually and handle with postMessage
      const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!
      const tenantId = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID!
      
      const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback')
      const scopes = encodeURIComponent('https://graph.microsoft.com/Chat.ReadWrite.All https://graph.microsoft.com/User.Read')
      
      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${clientId}` +
        `&response_type=token` +
        `&redirect_uri=${redirectUri}` +
        `&scope=${scopes}` +
        `&response_mode=fragment` +
        `&state=teams_auth`

      console.log('Opening auth popup with URL:', authUrl)

      // Open popup window
      const popup = window.open(
        authUrl,
        'teamsAuth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Listen for the auth response
      const authPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Authentication timeout after 60 seconds'))
          popup.close()
        }, 60000)

        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return

          console.log('Received auth message:', event.data)

          if (event.data.type === 'TEAMS_AUTH_SUCCESS') {
            clearTimeout(timeout)
            window.removeEventListener('message', messageHandler)
            popup.close()
            resolve(event.data.payload)
          } else if (event.data.type === 'TEAMS_AUTH_ERROR') {
            clearTimeout(timeout)
            window.removeEventListener('message', messageHandler)
            popup.close()
            reject(new Error(event.data.error || 'Authentication failed'))
          }
        }

        window.addEventListener('message', messageHandler)

        // Check if popup was closed manually
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            clearTimeout(timeout)
            window.removeEventListener('message', messageHandler)
            reject(new Error('Authentication cancelled'))
          }
        }, 1000)
      })

      const authResult = await authPromise

      console.log('Got access token, fetching user info from Microsoft Graph...')

      // Get real user info from Microsoft Graph
      try {
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${authResult.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!userResponse.ok) {
          throw new Error(`Graph API error: ${userResponse.status}`)
        }

        const userData = await userResponse.json()
        
        const realUser = {
          displayName: userData.displayName || 'Unknown User',
          email: userData.mail || userData.userPrincipalName || 'No email',
          id: userData.id || 'unknown'
        }

        console.log('Got real user info:', realUser)

        setAuthState(prev => ({
          ...prev,
          isSignedIn: true,
          user: realUser,
          isLoading: false,
          error: null
        }))

        onAuthChange(true, realUser, authResult.access_token)

      } catch (graphError) {
        console.error('Failed to get user info from Graph:', graphError)
        
        // Fall back to basic info from the auth result if Graph fails
        const fallbackUser = {
          displayName: 'Authenticated User',
          email: 'unknown@company.com',
          id: 'auth_user'
        }

        setAuthState(prev => ({
          ...prev,
          isSignedIn: true,
          user: fallbackUser,
          isLoading: false,
          error: null
        }))

        onAuthChange(true, fallbackUser, authResult.access_token)
      }

    } catch (error) {
      console.error('Sign in failed:', error)
      setAuthState(prev => ({
        ...prev,
        isSignedIn: false,
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed'
      }))
    }
  }

  const handleSignOut = () => {
    setAuthState(prev => ({
      ...prev,
      isSignedIn: false,
      user: null,
      error: null
    }))
    onAuthChange(false, null)
  }

  // Show loading state during initialization
  if (!authState.isInitialized) {
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Microsoft Teams Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Initializing...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state if not configured
  if (authState.error && !isConfigured()) {
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Microsoft Teams Integration
          </CardTitle>
          <CardDescription className="text-xs">
            Enhanced device search unavailable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <AlertCircle className="h-3 w-3" />
            <span>Credentials not configured</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          Microsoft Teams Integration
        </CardTitle>
        <CardDescription className="text-xs">
          {authState.isSignedIn 
            ? 'Connected - Enhanced device search available' 
            : 'Sign in to search Teams messages for device information'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {authState.isSignedIn && authState.user ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  <Shield className="h-3 w-3 mr-1" />
                  Signed In
                </Badge>
                <span className="text-xs text-gray-600">
                  {authState.user.displayName}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={authState.isLoading}
                className="text-xs h-7"
              >
                <LogOut className="h-3 w-3 mr-1" />
                Sign Out
              </Button>
            </div>
            <div className="text-xs text-gray-600 bg-white p-2 rounded border">
              <strong>Enhanced Features:</strong>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Searches your Teams chats for 5A00 device IDs</li>
                <li>• Shows relevant conversations and context</li>
                <li>• Includes message authors and timestamps</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-gray-600">
              Connect your Microsoft account to enable Teams message search for device IDs starting with "5A00".
            </div>
            <Button
              onClick={handleSignIn}
              disabled={authState.isLoading}
              size="sm"
              className="w-full text-xs"
            >
              {authState.isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="h-3 w-3 mr-1" />
                  Sign In to Microsoft
                </>
              )}
            </Button>
            {authState.error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {authState.error}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 border-t pt-2">
          <strong>Permissions:</strong> Chat.ReadWrite.All, User.Read
        </div>
      </CardContent>
    </Card>
  )
}
