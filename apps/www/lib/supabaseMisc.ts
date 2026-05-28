import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

let supabase: ReturnType<typeof createClient<Database>> | null = null

function getSupabaseMisc() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_MISC_USE_URL
    const key = process.env.NEXT_PUBLIC_MISC_USE_ANON_KEY

    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_MISC_USE_URL and NEXT_PUBLIC_MISC_USE_ANON_KEY are required')
    }

    supabase = createClient<Database>(url, key)
  }

  return supabase
}

export type SupabaseClient = ReturnType<typeof getSupabaseMisc>

export default getSupabaseMisc
