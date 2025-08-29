'use client'

import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText,
  Smartphone,
  MessageSquare,
  Users
} from 'lucide-react'

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
  teams_search_results: any | null
  teams_summary: string | null
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
}

interface RMATicketDisplayProps {
  ticket: RMATicket
}

export function RMATicketDisplay({ ticket }: RMATicketDisplayProps) {
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

  const getProcessingStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'processing': return <Clock className="h-4 w-4 text-blue-600 animate-spin" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              RMA #{ticket.rma_number}
            </CardTitle>
            <div className="flex items-center gap-2">
              {getProcessingStatusIcon(ticket.processing_status)}
              <span className="text-sm text-gray-600 capitalize">
                {ticket.processing_status}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                <strong>Processed:</strong> {format(new Date(ticket.created_at), 'PPp')}
              </span>
            </div>
            {ticket.ticket_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  <strong>Ticket Date:</strong> {format(new Date(ticket.ticket_date), 'PPp')}
                </span>
              </div>
            )}
            {ticket.status && (
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Information */}
      {ticket.customer_information && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{ticket.customer_information}</p>
          </CardContent>
        </Card>
      )}

      {/* Device IDs */}
      {ticket.vids_associated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Device IDs (VIDs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ticket.vids_associated.split(', ').map((vid, index) => (
                <Badge key={index} variant="outline" className="font-mono">
                  {vid}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reason Analysis */}
      {ticket.primary_reason && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Return Reason Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-1">Primary Reason</h4>
              <Badge className="bg-blue-100 text-blue-800">
                {ticket.primary_reason}
              </Badge>
            </div>
            
            {ticket.specific_issue && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-1">Specific Issue</h4>
                <p className="text-sm text-gray-600">{ticket.specific_issue}</p>
              </div>
            )}
            
            {ticket.customer_impact && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-1">Customer Impact</h4>
                <p className="text-sm text-gray-600">{ticket.customer_impact}</p>
              </div>
            )}
            
            {ticket.timeline && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-1">Timeline</h4>
                <p className="text-sm text-gray-600">{ticket.timeline}</p>
              </div>
            )}
            
            {ticket.additional_notes && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-1">Additional Notes</h4>
                <p className="text-sm text-gray-600">{ticket.additional_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Teams Search Results */}
      {(ticket.teams_summary || ticket.teams_search_results) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Microsoft Teams Search Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticket.teams_summary && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Summary</h4>
                <div className="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded-md">
                  {ticket.teams_summary}
                </div>
              </div>
            )}
            
            {ticket.teams_search_results && Array.isArray(ticket.teams_search_results) && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Search Details</h4>
                <div className="space-y-3">
                  {ticket.teams_search_results.map((result: any, index: number) => (
                    <div key={index} className="border rounded-md p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">
                          Device {result.deviceId}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {result.messagesFound} message(s) found
                        </span>
                      </div>
                      {result.messages && result.messages.length > 0 && (
                        <div className="space-y-2">
                          {result.messages.slice(0, 3).map((msg: any, msgIndex: number) => (
                            <div key={msgIndex} className="bg-white p-2 rounded text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">
                                  {msg.from?.user?.displayName || 'Unknown User'}
                                </span>
                                <span className="text-gray-500">
                                  {format(new Date(msg.createdDateTime), 'MMM d, yyyy')}
                                </span>
                              </div>
                              <div className="text-gray-600 line-clamp-2">
                                {msg.body?.content?.replace(/<[^>]*>/g, '').substring(0, 150)}...
                              </div>
                            </div>
                          ))}
                          {result.messages.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{result.messages.length - 3} more messages
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {ticket.error_message && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700">{ticket.error_message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
