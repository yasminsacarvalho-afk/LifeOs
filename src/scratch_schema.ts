import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://x.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'x'

// But actually, we don't have the env vars here unless we run it through npm/vite or parse the .env file
