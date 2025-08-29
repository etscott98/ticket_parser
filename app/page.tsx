'use client'

import { useState, useEffect } from 'react'
import { RMAForm } from '@/components/rma-form'
import { RMATicketDisplay } from '@/components/rma-ticket-display'
import { TeamsSignIn } from '@/components/teams-signin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Eye, Clock, CheckCircle2, AlertCircle, Package } from 'lucide-react'

interface RMATicket {
  id: string
  rma_number: string
  created_at: string
  ticket_date: string | null
  customer_name: string | null
  customer_email: string | null
  customer_information: string | null
  status: string | null
  vids_associated: string | null
  primary_reason: string | null
  specific_issue: string | null
  customer_impact: string | null
  timeline: string | null
  additional_notes: string | null
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
}

export default function HomePage() {
  const [selectedTicket, setSelectedTicket] = useState<RMATicket | null>(null)
  const [recentTickets, setRecentTickets] = useState<RMATicket[]>([])
  const [isLoadingRecent, setIsLoadingRecent] = useState(true)
  const [isTeamsAuthenticated, setIsTeamsAuthenticated] = useState(false)
  const [teamsUser, setTeamsUser] = useState<any>(null)
  const [teamsAccessToken, setTeamsAccessToken] = useState<string | null>(null)

  useEffect(() => {
    loadRecentTickets()
  }, [])

  const loadRecentTickets = async () => {
    try {
      setIsLoadingRecent(true)
      const response = await fetch('/api/rma/process?limit=10')
      if (response.ok) {
        const data = await response.json()
        setRecentTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('Failed to load recent tickets:', error)
    } finally {
      setIsLoadingRecent(false)
    }
  }

  const handleTicketProcessed = (ticket: RMATicket) => {
    setSelectedTicket(ticket)
    loadRecentTickets() // Refresh the list
  }

  const handleViewTicket = (ticket: RMATicket) => {
    setSelectedTicket(ticket)
  }

  const handleTeamsAuthChange = (isAuthenticated: boolean, user: any) => {
    setIsTeamsAuthenticated(isAuthenticated)
    setTeamsUser(user)
    setTeamsAccessToken(null) // Simplify for now - will get token when needed
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'processing': return <Clock className="h-4 w-4 text-blue-600" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      case 'not found': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-4xl font-bold text-gray-900">
          <Package className="h-8 w-8 text-blue-600" />
          RMA Management System
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Automated RMA ticket processing with Freshdesk integration and AI-powered analysis. 
          Enter an RMA number to get detailed customer information, device IDs, and return reason analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Form and Recent Tickets */}
        <div className="lg:col-span-1 space-y-6">
          {/* RMA Form */}
          <RMAForm 
            onTicketProcessed={handleTicketProcessed} 
            teamsAccessToken={teamsAccessToken}
          />

          {/* Teams Sign In - Temporarily disabled */}
          {/* <TeamsSignIn onAuthChange={handleTeamsAuthChange} /> */}

          {/* Recent Tickets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Recent Tickets</CardTitle>
                <CardDescription>Recently processed RMA tickets</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadRecentTickets}
                disabled={isLoadingRecent}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingRecent ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingRecent ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  Loading recent tickets...
                </div>
              ) : recentTickets.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  No tickets processed yet
                </div>
              ) : (
                recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(ticket.processing_status)}
                      <div>
                        <div className="font-medium text-sm">#{ticket.rma_number}</div>
                        <div className="text-xs text-gray-500">
                          {ticket.customer_name || 'Unknown Customer'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ticket.status && (
                        <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewTicket(ticket)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Ticket Details */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <RMATicketDisplay ticket={selectedTicket} />
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <CardContent className="text-center space-y-4">
                <Package className="h-16 w-16 text-gray-300 mx-auto" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No ticket selected
                  </h3>
                  <p className="text-gray-500">
                    Process an RMA ticket or select one from the recent tickets list to view details
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-blue-600" />
              Automated Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Automatically fetches ticket data from Freshdesk, extracts device IDs, 
              and analyzes return reasons using AI.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Organized Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Structured analysis with primary reason, specific issue, customer impact, 
              timeline, and additional notes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="h-5 w-5 text-purple-600" />
              Real-time Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Live processing status updates and persistent storage in Supabase 
              for easy access and management.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
