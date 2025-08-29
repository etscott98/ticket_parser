export interface Database {
  public: {
    Tables: {
      rma_tickets: {
        Row: {
          id: string
          rma_number: string
          created_at: string
          updated_at: string
          ticket_date: string | null
          customer_name: string | null
          customer_email: string | null
          customer_information: string | null
          status: string | null
          freshdesk_status_code: number | null
          vids_associated: string | null
          primary_reason: string | null
          specific_issue: string | null
          customer_impact: string | null
          timeline: string | null
          additional_notes: string | null
          raw_ticket_data: any | null
          teams_search_results: any | null
          teams_summary: string | null
          processing_status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
        }
        Insert: {
          id?: string
          rma_number: string
          created_at?: string
          updated_at?: string
          ticket_date?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_information?: string | null
          status?: string | null
          freshdesk_status_code?: number | null
          vids_associated?: string | null
          primary_reason?: string | null
          specific_issue?: string | null
          customer_impact?: string | null
          timeline?: string | null
          additional_notes?: string | null
          raw_ticket_data?: any | null
          teams_search_results?: any | null
          teams_summary?: string | null
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
        }
        Update: {
          id?: string
          rma_number?: string
          created_at?: string
          updated_at?: string
          ticket_date?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_information?: string | null
          status?: string | null
          freshdesk_status_code?: number | null
          vids_associated?: string | null
          primary_reason?: string | null
          specific_issue?: string | null
          customer_impact?: string | null
          timeline?: string | null
          additional_notes?: string | null
          raw_ticket_data?: any | null
          teams_search_results?: any | null
          teams_summary?: string | null
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      processing_status: 'pending' | 'processing' | 'completed' | 'failed'
    }
  }
}
