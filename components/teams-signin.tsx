'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, LogIn, LogOut, Shield, AlertCircle } from 'lucide-react'
import { TeamsAuthService } from '@/lib/teams-auth'

interface TeamsSignInProps {
  onAuthChange: (isAuthenticated: boolean, user: any) => void
}

export function TeamsSignIn({ onAuthChange }: TeamsSignInProps) {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authService, setAuthService] = useState<TeamsAuthService | null>(null)

  useEffect(() => {
    // Initialize Teams auth service
    const initAuth = async () => {
      try {
        const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID
        const tenantId = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID
        
        if (!clientId || !tenantId) {
          setError('Microsoft Teams credentials not configured')
          return
        }

        console.log('Initializing Teams auth with:', { clientId, tenantId })

        const service = new TeamsAuthService({
          clientId,
          tenantId,
          redirectUri: window.location.origin
        })

        await service.initialize()
        setAuthService(service)

        // Check if already signed in
        if (service.isSignedIn()) {
          const user = service.getCurrentUser()
          console.log('User already signed in:', user)
          setIsSignedIn(true)
          setCurrentUser(user)
          onAuthChange(true, user)
        } else {
          console.log('User not signed in')
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        setError('Failed to initialize Teams authentication')
      }
    }

    initAuth()
  }, [onAuthChange])

  const handleSignIn = async () => {
    if (!authService) {
      setError('Authentication service not initialized')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Starting sign-in...')
      const user = await authService.signIn()
      
      if (user) {
        console.log('Sign-in successful:', user)
        setIsSignedIn(true)
        setCurrentUser(user)
        onAuthChange(true, user)
      } else {
        console.log('Sign-in returned null (possibly redirect flow)')
        // For redirect flow, the page will reload and handle auth in useEffect
      }
    } catch (error) {
      console.error('Sign in failed:', error)
      setError(error instanceof Error ? error.message : 'Sign in failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (!authService) return

    setIsLoading(true)
    setError(null)

    try {
      await authService.signOut()
      setIsSignedIn(false)
      setCurrentUser(null)
      onAuthChange(false, null)
    } catch (error) {
      console.error('Sign out failed:', error)
      setError(error instanceof Error ? error.message : 'Sign out failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (error && !authService) {
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
            <span>{error}</span>
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
          {isSignedIn 
            ? 'Connected - Enhanced device search available' 
            : 'Sign in to search Teams messages for device information'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isSignedIn && currentUser ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  <Shield className="h-3 w-3 mr-1" />
                  Signed In
                </Badge>
                <span className="text-xs text-gray-600">
                  {currentUser.displayName}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isLoading}
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
              disabled={isLoading || !authService}
              size="sm"
              className="w-full text-xs"
            >
              <LogIn className="h-3 w-3 mr-1" />
              {isLoading ? 'Signing In...' : 'Sign In to Microsoft'}
            </Button>
            {error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 border-t pt-2">
          <strong>Required Permissions:</strong> Chat.Read, User.Read
        </div>
      </CardContent>
    </Card>
  )
}
