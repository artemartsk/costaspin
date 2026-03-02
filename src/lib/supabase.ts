import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL) {
    console.warn('[Supabase] VITE_SUPABASE_URL not set — running in demo mode with mock data')
}

export const supabase = SUPABASE_URL
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            storage: localStorage,
            persistSession: true,
            autoRefreshToken: true,
        },
    })
    : null

export const isSupabaseConfigured = !!SUPABASE_URL
