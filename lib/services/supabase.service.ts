import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../database.types'
import { ISupabaseService } from '../interfaces'

export class SupabaseService implements ISupabaseService {
  private client: SupabaseClient<Database>

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    this.client = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  }

  query<T>(table: string) {
    return this.client.from(table)
  }

  from(table: string) {
    return this.client.from(table)
  }

  getClient() {
    return this.client
  }
}

// Singleton instance for admin access
let supabaseAdminInstance: SupabaseService | null = null

export function getSupabaseAdmin(): SupabaseService {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = new SupabaseService()
  }
  return supabaseAdminInstance
}

// Export for backward compatibility
export const supabaseAdmin = getSupabaseAdmin()
