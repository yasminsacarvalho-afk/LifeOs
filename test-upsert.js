import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY)
async function run() {
  const { data, error } = await supabase.from('shifts').upsert(
    { seller_id: "1a547b8c-2561-4dac-bc04-0748a1d57688", shift_date: "2026-06-07", shift_type: "completa", status: "agendado" },
    { onConflict: 'seller_id,shift_date' }
  )
  console.log("Error:", error)
}
run()
