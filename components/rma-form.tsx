'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Loader2 } from 'lucide-react'

interface RMAFormProps {
  onTicketProcessed: (ticket: any) => void
  teamsAccessToken?: string | null
}

export function RMAForm({ onTicketProcessed, teamsAccessToken }: RMAFormProps) {
  const [rmaNumber, setRmaNumber] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Form submitted with RMA:', rmaNumber)
    
    if (!rmaNumber.trim()) {
      setError('Please enter an RMA number')
      return
    }

    console.log('Starting processing...')
    setIsProcessing(true)
    setError(null)

    try {
      const requestBody: any = { rmaNumber: rmaNumber.trim() }
      
      // Include Teams access token if available
      if (teamsAccessToken) {
        requestBody.teamsAccessToken = teamsAccessToken
        console.log('Including Teams access token in request')
      }
      
      console.log('Processing RMA:', requestBody)
      console.log('About to make fetch request...')
      
      // Create timeout controller
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log('Request timed out after 30 seconds')
        controller.abort()
      }, 30000) // 30 second timeout
      
      console.log('Making fetch request now...')
      const response = await fetch('/api/rma/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      
      console.log('Fetch completed, response:', response)
      clearTimeout(timeoutId)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process RMA')
      }

      setRmaNumber('')
      onTicketProcessed(data.ticket)
      
    } catch (error) {
      console.error('Error processing RMA:', error)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Request timed out after 30 seconds. Please try again.')
        } else {
          setError(error.message)
        }
      } else {
        setError('Failed to process RMA ticket')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Process RMA Ticket
        </CardTitle>
        <CardDescription>
          Enter an RMA number to fetch and analyze the ticket from Freshdesk
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="rma-number" className="text-sm font-medium">
              RMA Number
            </label>
            <Input
              id="rma-number"
              type="text"
              placeholder="e.g., 23526"
              value={rmaNumber}
              onChange={(e) => setRmaNumber(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Process RMA'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
