import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Public client for client-side operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Re-export admin client from the service for backward compatibility
export { supabaseAdmin } from './services/supabase.service'
