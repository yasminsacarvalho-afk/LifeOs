import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'MISSING'
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'MISSING'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function test() {
  const newBook = {
    title: "Test Book", author: "Test", category: "Negócios", knowledge_area: "Estratégia",
    format: "fisico", status: "quero_ler", total_pages: 100, language: "pt-br", start_date: "2026-07-29", end_date: null
  }
  
  const { data, error } = await supabase
        .from('pos_library')
        .insert([{ ...newBook, pages_read: 0 }])
        .select()
        .single();
        
  console.log("Error:", error)
  console.log("Data:", data)
}
test()
