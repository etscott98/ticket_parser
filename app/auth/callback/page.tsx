'use client'

import { useEffect } from 'react'

export default function AuthCallback() {
  useEffect(() => {
    // Extract token from URL fragment
    const fragment = window.location.hash.substr(1)
    const params = new URLSearchParams(fragment)
    
    const accessToken = params.get('access_token')
    const error = params.get('error')
    const errorDescription = params.get('error_description')

    if (error) {
      console.error('Auth error:', error, errorDescription)
      
      // Send error back to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'TEAMS_AUTH_ERROR',
          error: errorDescription || error
        }, window.location.origin)
      }
    } else if (accessToken) {
      console.log('Auth success, got access token')
      
      // Send success back to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'TEAMS_AUTH_SUCCESS',
          payload: {
            access_token: accessToken,
            expires_in: params.get('expires_in'),
            scope: params.get('scope')
          }
        }, window.location.origin)
      }
    } else {
      console.error('No access token or error found in URL')
      
      if (window.opener) {
        window.opener.postMessage({
          type: 'TEAMS_AUTH_ERROR',
          error: 'No access token received'
        }, window.location.origin)
      }
    }

    // Close popup after a short delay
    setTimeout(() => {
      window.close()
    }, 1000)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authentication Complete
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You can close this window now.
          </p>
        </div>
      </div>
    </div>
  )
}
