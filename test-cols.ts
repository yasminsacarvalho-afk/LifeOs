import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'MISSING'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'MISSING'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function test() {
  const { data, error } = await supabase.from('pos_library').select('*').limit(1)
  console.log("Error:", error)
  console.log("Keys:", data && data.length > 0 ? Object.keys(data[0]) : "No data")
}
test()
